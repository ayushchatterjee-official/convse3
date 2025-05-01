
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { 
  Send, 
  MoreVertical, 
  Image, 
  File, 
  Trash2, 
  ArrowLeft,
  Users,
  Shield,
  UserX,
  Video,
  SmilePlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFileType, uploadFile } from '@/lib/fileUpload';

interface MessageProfile {
  name: string;
  profile_pic: string | null;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  content_type: 'text' | 'link' | 'image' | 'video' | 'file';
  file_url: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  created_at: string;
  profiles: MessageProfile | null;
}

interface GroupMember {
  user_id: string;
  is_admin: boolean;
  banned: boolean;
  profiles: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  } | null;
}

interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
  is_private: boolean;
  code: string;
}

function isValidProfile(obj: any): obj is MessageProfile {
  return obj && typeof obj === 'object' && 'name' in obj;
}

const ChatRoom = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [memberToAction, setMemberToAction] = useState<GroupMember | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!user || !groupId) {
      navigate('/dashboard');
      return;
    }
    
    const checkMembership = async () => {
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select('*, is_admin')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();
        
        if (error || !data) {
          toast.error('You are not a member of this group');
          navigate('/dashboard');
          return;
        }

        // Set if the current user is a group admin
        setIsGroupAdmin(!!data.is_admin);
        
        fetchGroup();
        fetchMessages();
        fetchMembers();
        
        const subscription = supabase
          .channel('public:messages')
          .on(
            'postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'messages',
              filter: `group_id=eq.${groupId}` 
            }, 
            (payload) => {
              if (payload.eventType === 'INSERT') {
                fetchNewMessage(payload.new.id);
              }
              if (payload.eventType === 'UPDATE') {
                setMessages(currentMessages => 
                  currentMessages.map(msg => 
                    msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                  )
                );
              }
            }
          )
          .subscribe();
          
        const memberSubscription = supabase
          .channel('public:group_members')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'group_members',
              filter: `group_id=eq.${groupId}`
            },
            () => {
              fetchMembers();
            }
          )
          .subscribe();
        
        return () => {
          subscription.unsubscribe();
          memberSubscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error checking membership:', error);
        navigate('/dashboard');
      }
    };
    
    checkMembership();
  }, [user, groupId, navigate]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      setGroup(data as Group);
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  };
  
  const fetchMessages = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id(
            name,
            profile_pic
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const typedMessages = data.map(msg => {
          const profileData = isValidProfile(msg.profiles) ? msg.profiles : null;
          
          return {
            ...msg,
            content_type: msg.content_type as 'text' | 'link' | 'image' | 'video' | 'file',
            profiles: profileData
          };
        }) as Message[];
        
        setMessages(typedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchNewMessage = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id(
            name,
            profile_pic
          )
        `)
        .eq('id', messageId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const profileData = isValidProfile(data.profiles) ? data.profiles : null;
        
        const typedMessage = {
          ...data,
          content_type: data.content_type as 'text' | 'link' | 'image' | 'video' | 'file',
          profiles: profileData
        } as Message;
        
        setMessages(current => [...current, typedMessage]);
      }
    } catch (error) {
      console.error('Error fetching new message:', error);
    }
  };
  
  const fetchMembers = async () => {
    if (!groupId) return;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          is_admin,
          banned,
          profiles:user_id(
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      if (data) {
        const typedMembers = data.map(member => {
          const profileData = member.profiles && typeof member.profiles === 'object' ? member.profiles : null;
          
          return {
            user_id: member.user_id,
            is_admin: member.is_admin || false,
            banned: member.banned || false,
            profiles: profileData
          };
        }) as GroupMember[];
        
        setMembers(typedMembers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if ((!message.trim() && !selectedFile) || !user || !groupId) return;
    
    try {
      if (selectedFile) {
        // Handle file upload
        const contentType = getFileType(selectedFile); 
        const folderPath = `${user.id}/${groupId}`;
        const fileUrl = await uploadFile(selectedFile, 'user_files', folderPath);
        
        if (!fileUrl) {
          toast.error('Failed to upload file');
          return;
        }
        
        // Insert message with file
        await supabase.from('messages').insert({
          group_id: groupId,
          user_id: user.id,
          content: selectedFile.name,
          content_type: contentType,
          file_url: fileUrl
        });
        
        // Reset file state
        setSelectedFile(null);
        setFilePreview(null);
        setShowFilePreview(false);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (documentInputRef.current) documentInputRef.current.value = '';
      }
      
      if (message.trim()) {
        // Send text message
        const { error } = await supabase
          .from('messages')
          .insert({
            group_id: groupId,
            user_id: user.id,
            content: message,
            content_type: 'text'
          });
        
        if (error) throw error;
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setSelectedFile(file);
    setFileType(type);
    
    // Create preview for images and videos
    if (type === 'image' || type === 'video') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    
    setShowFilePreview(true);
  };

  const cancelFileUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setShowFilePreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_by: user?.id
        })
        .eq('id', messageId);
      
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };
  
  const handleLeaveGroup = async () => {
    if (!user?.id || !groupId) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      toast.success('You have left the group');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave the group');
    }
  };

  const handleBanMember = async () => {
    if (!memberToAction || !groupId) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ banned: true })
        .eq('group_id', groupId)
        .eq('user_id', memberToAction.user_id);

      if (error) throw error;
      
      toast.success(`${memberToAction.profiles?.name || 'Member'} has been banned from the group`);
      setShowBanDialog(false);
      fetchMembers();
    } catch (error) {
      console.error('Error banning member:', error);
      toast.error('Failed to ban member');
    }
  };

  const handleRemoveBan = async (userId: string) => {
    if (!groupId) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ banned: false })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Ban has been removed');
      fetchMembers();
    } catch (error) {
      console.error('Error removing ban:', error);
      toast.error('Failed to remove ban');
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (!groupId || !isGroupAdmin) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_admin: !isCurrentlyAdmin })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(`Admin status ${isCurrentlyAdmin ? 'removed' : 'granted'}`);
      fetchMembers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prevMessage => prevMessage + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if user can perform admin actions on this message
  const canModerateMessage = (messageUserId: string) => {
    return isGroupAdmin || isAdmin || messageUserId === user?.id;
  };

  const canModerateUser = (userId: string, userIsAdmin: boolean) => {
    // Site admins can moderate anyone
    if (isAdmin) return true;
    // Group admins can moderate non-admins
    if (isGroupAdmin && !userIsAdmin) return true;
    return false;
  };
  
  const renderFilePreview = (msg: Message) => {
    if (msg.content_type === 'image' && msg.file_url) {
      return (
        <div className="space-y-1">
          <img src={msg.file_url} alt="Image" className="max-w-full rounded" />
          {msg.content && <p>{msg.content}</p>}
        </div>
      );
    } else if (msg.content_type === 'video' && msg.file_url) {
      return (
        <div className="space-y-1">
          <video controls className="max-w-full rounded">
            <source src={msg.file_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {msg.content && <p>{msg.content}</p>}
        </div>
      );
    } else if (msg.content_type === 'file' && msg.file_url) {
      return (
        <div className="flex items-center">
          <File className="mr-2 h-4 w-4" />
          <a href={msg.file_url} target="_blank" rel="noreferrer" className="underline">
            {msg.content || 'File'}
          </a>
        </div>
      );
    } else {
      return msg.content;
    }
  };

  const renderCurrentFilePreview = () => {
    if (!selectedFile || !showFilePreview) return null;
    
    if (fileType === 'image' && filePreview) {
      return (
        <div className="relative mb-2 border rounded p-2 bg-gray-50 dark:bg-gray-800">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 rounded-full bg-gray-800/60 hover:bg-gray-800/80 text-white"
            onClick={cancelFileUpload}
          >
            <X className="h-4 w-4" />
          </Button>
          <img src={filePreview} alt="Preview" className="max-h-40 mx-auto" />
          <p className="text-xs text-center mt-1 truncate">{selectedFile.name}</p>
        </div>
      );
    } else if (fileType === 'video' && filePreview) {
      return (
        <div className="relative mb-2 border rounded p-2 bg-gray-50 dark:bg-gray-800">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 rounded-full bg-gray-800/60 hover:bg-gray-800/80 text-white"
            onClick={cancelFileUpload}
          >
            <X className="h-4 w-4" />
          </Button>
          <video controls className="max-h-40 mx-auto">
            <source src={filePreview} />
            Your browser does not support the video tag.
          </video>
          <p className="text-xs text-center mt-1 truncate">{selectedFile.name}</p>
        </div>
      );
    } else if (fileType === 'file') {
      return (
        <div className="relative mb-2 border rounded p-2 bg-gray-50 dark:bg-gray-800">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 rounded-full bg-gray-800/60 hover:bg-gray-800/80 text-white"
            onClick={cancelFileUpload}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center gap-2">
            <File className="h-10 w-10 text-blue-600" />
            <div>
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {showMembers && (
          <div className="w-64 border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Group Members</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowMembers(false)}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      {member.profiles?.profile_pic ? (
                        <AvatarImage src={member.profiles.profile_pic} alt={member.profiles?.name || 'User'} />
                      ) : (
                        <AvatarFallback>
                          {member.profiles?.name ? getInitials(member.profiles.name) : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{member.profiles?.name || 'Unknown User'}</span>
                        {member.is_admin && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800">
                            Admin
                          </Badge>
                        )}
                        {member.banned && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800">
                            Banned
                          </Badge>
                        )}
                        {member.profiles?.account_status === 'admin' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800">
                            Site Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show moderation options if user has permissions */}
                  {canModerateUser(member.user_id, member.is_admin) && member.user_id !== user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isGroupAdmin && (
                          <DropdownMenuItem onClick={() => handleToggleAdmin(member.user_id, member.is_admin)}>
                            <Shield className="mr-2 h-4 w-4" />
                            {member.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </DropdownMenuItem>
                        )}
                        
                        {member.banned ? (
                          <DropdownMenuItem onClick={() => handleRemoveBan(member.user_id)}>
                            <UserX className="mr-2 h-4 w-4" />
                            Remove Ban
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => {
                              setMemberToAction(member);
                              setShowBanDialog(true);
                            }}
                            className="text-red-500 dark:text-red-400"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Ban From Group
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col w-full">
          <div className="border-b p-4 flex items-center justify-between bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-10 w-10 mr-3">
                {group?.profile_pic ? (
                  <AvatarImage src={group.profile_pic} alt={group?.name || 'Group'} />
                ) : (
                  <AvatarFallback>{group?.name ? getInitials(group.name) : 'G'}</AvatarFallback>
                )}
              </Avatar>
              
              <div>
                <h2 className="font-bold">{group?.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} members</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowMembers(!showMembers)}
              >
                <Users className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowMembers(!showMembers)}>
                    View Members
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLeaveGroup} className="text-red-500 dark:text-red-400">
                    Leave Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex max-w-[75%]">
                    {msg.user_id !== user?.id && (
                      <Avatar className="h-8 w-8 mr-2 mt-1">
                        {msg.profiles?.profile_pic ? (
                          <AvatarImage src={msg.profiles.profile_pic} alt={msg.profiles?.name || 'User'} />
                        ) : (
                          <AvatarFallback>
                            {msg.profiles?.name ? getInitials(msg.profiles.name) : 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    
                    <div>
                      <div className="flex items-end space-x-1">
                        {msg.user_id !== user?.id && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{msg.profiles?.name || 'Unknown User'}</span>
                        )}
                      </div>
                      
                      <div 
                        className={`rounded-lg px-4 py-2 ${
                          msg.user_id === user?.id
                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                            : 'bg-white text-gray-800 border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                        } ${msg.is_deleted ? 'bg-gray-100 italic dark:bg-gray-700' : ''}`}
                      >
                        {msg.is_deleted ? (
                          <span className="text-gray-500 dark:text-gray-400">
                            {msg.deleted_by === msg.user_id
                              ? 'This message was deleted'
                              : `${msg.profiles?.name || 'User'} deleted this message`
                            }
                          </span>
                        ) : renderFilePreview(msg)}
                        
                        <div className="text-xs mt-1 text-right">
                          {formatTimestamp(msg.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    {!msg.is_deleted && canModerateMessage(msg.user_id) && (
                      <div className="self-center ml-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
            {renderCurrentFilePreview()}
            
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    className="shrink-0"
                  >
                    <SmilePlus className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" side="top">
                  <EmojiPicker onEmojiClick={onEmojiClick} lazyLoadEmojis={true} />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0">
                    <Image className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60" align="start">
                  <Tabs defaultValue="photos">
                    <TabsList className="grid grid-cols-3 mb-2">
                      <TabsTrigger value="photos">Photos</TabsTrigger>
                      <TabsTrigger value="videos">Videos</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                    </TabsList>
                    <TabsContent value="photos" className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upload an image</p>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => handleFileSelect(e, 'image')}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                      />
                    </TabsContent>
                    <TabsContent value="videos" className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upload a video</p>
                      <input
                        type="file"
                        accept="video/*"
                        ref={videoInputRef}
                        onChange={(e) => handleFileSelect(e, 'video')}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                      />
                    </TabsContent>
                    <TabsContent value="files" className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upload a document</p>
                      <input
                        type="file"
                        ref={documentInputRef}
                        onChange={(e) => handleFileSelect(e, 'file')}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                      />
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>

              <Input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                disabled={!message.trim() && !selectedFile}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Ban Member Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {memberToAction?.profiles?.name || 'this member'} from the group?
              They will not be able to send messages or see group content while banned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanMember}>
              Ban Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ChatRoom;
