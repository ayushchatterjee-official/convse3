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
import { 
  Send, 
  MoreVertical, 
  Image, 
  File, 
  Trash2, 
  ArrowLeft,
  Users,
  Shield,
  UserX
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user || !groupId) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: message,
          content_type: 'text'
        });
      
      if (error) throw error;
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    if (!e.target.files || !e.target.files[0] || !user || !groupId) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${groupId}/${fileName}`;

    try {
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: file.name,
          content_type: type,
          file_url: publicUrl
        });

      if (messageError) throw messageError;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
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
  
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {showMembers && (
          <div className="w-64 border-r border-gray-200 bg-white p-4 overflow-y-auto">
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
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Admin
                          </Badge>
                        )}
                        {member.banned && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            Banned
                          </Badge>
                        )}
                        {member.profiles?.account_status === 'admin' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
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
                            className="text-red-500"
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
          <div className="border-b p-4 flex items-center justify-between bg-white">
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
                <p className="text-xs text-gray-500">{members.length} members</p>
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
                  <DropdownMenuItem onClick={handleLeaveGroup} className="text-red-500">
                    Leave Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
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
                          <span className="text-xs text-gray-500 mb-1">{msg.profiles?.name || 'Unknown User'}</span>
                        )}
                      </div>
                      
                      <div 
                        className={`rounded-lg px-4 py-2 ${
                          msg.user_id === user?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-800 border'
                        } ${msg.is_deleted ? 'bg-gray-100 italic' : ''}`}
                      >
                        {msg.is_deleted ? (
                          <span className="text-gray-500">
                            {msg.deleted_by === msg.user_id
                              ? 'This message was deleted'
                              : `${msg.profiles?.name || 'User'} deleted this message`
                            }
                          </span>
                        ) : msg.content_type === 'text' ? (
                          msg.content
                        ) : msg.content_type === 'image' ? (
                          <div className="space-y-1">
                            <img src={msg.file_url || ''} alt="Image" className="max-w-full rounded" />
                            {msg.content && <p>{msg.content}</p>}
                          </div>
                        ) : msg.content_type === 'file' ? (
                          <div className="flex items-center">
                            <File className="mr-2 h-4 w-4" />
                            <a href={msg.file_url || '#'} target="_blank" rel="noreferrer" className="underline">
                              {msg.content || 'File'}
                            </a>
                          </div>
                        ) : (
                          msg.content
                        )}
                        
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
          
          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'image')}
              />
              <label 
                htmlFor="image-upload" 
                className="cursor-pointer"
              >
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0"
                >
                  <Image className="h-5 w-5" />
                </Button>
              </label>

              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'file')}
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer"
              >
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0"
                >
                  <File className="h-5 w-5" />
                </Button>
              </label>

              <Input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
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
