import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { UserAvatar } from '@/components/user/UserAvatar';
import { MentionText } from '@/components/shared/MentionText';
import { 
  Send, 
  Phone, 
  Video, 
  Users, 
  Settings, 
  Upload,
  Smile,
  MoreVertical,
  UserPlus,
  Shield,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Message {
  id: string;
  content: string | null;
  content_type: string;
  created_at: string;
  user_id: string;
  user_name: string;
  profile_pic: string | null;
  account_status: string;
  file_url: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_by_name: string | null;
}

interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
  is_private: boolean;
  code: string;
  password?: string | null;
}

const ChatRoom = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [processingMessageId, setProcessingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !groupId) {
      console.log('User or Group ID missing');
      navigate('/dashboard');
      return;
    }

    fetchGroupDetails();
    fetchMessages();
    checkAdminStatus();
    generateInviteCode();

    const messageChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as Message;
          setMessages(prevMessages => [...prevMessages, newMessage]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as Message;
          setMessages(prevMessages =>
            prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedMessageId = payload.old?.id;
          setMessages(prevMessages =>
            prevMessages.filter(msg => msg.id !== deletedMessageId)
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user, groupId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupDetails = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      if (groupData) {
        setGroup(groupData);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error('Failed to load group details');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          content_type,
          created_at,
          user_id,
          file_url,
          is_deleted,
          deleted_by,
          profiles (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedMessages = messagesData?.map(msg => ({
        id: msg.id,
        content: msg.content,
        content_type: msg.content_type,
        created_at: msg.created_at,
        user_id: msg.user_id,
        user_name: (msg.profiles as any)?.name || 'Unknown User',
        profile_pic: (msg.profiles as any)?.profile_pic || null,
        account_status: (msg.profiles as any)?.account_status || 'normal',
        file_url: msg.file_url,
        is_deleted: msg.is_deleted,
        deleted_by: msg.deleted_by,
        deleted_by_name: messagesData.find(m => m.user_id === msg.deleted_by)?.profiles?.name || null,
      })) as Message[];

      setMessages(formattedMessages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .single();

      if (memberError) throw memberError;
      setIsAdmin(memberData?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    try {
      let file_url = null;
      let content_type = 'text';

      if (file) {
        setUploading(true);
        const filePath = `groups/${groupId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('group-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('group-files').getPublicUrl(filePath);
        file_url = data.publicUrl;
        content_type = file.type.startsWith('image/') ? 'image' : 'file';
        setFile(null);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          content_type: content_type,
          group_id: groupId,
          user_id: user?.id,
          file_url: file_url,
        });

      if (error) throw error;

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleEmojiSelect = (emoji: { emoji: string }) => {
    setNewMessage(prevMessage => prevMessage + emoji.emoji);
  };

  const generateInviteCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite-code', {
        body: { groupId: groupId }
      });

      if (error) {
        console.error("Function Invoke Error:", error)
      } else {
        setInviteCode(data as string);
      }
    } catch (e) {
      console.error("Caught Error:", e)
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (processingMessageId) return;
    
    try {
      setProcessingMessageId(messageId);
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true,
          deleted_by: user?.id
        })
        .eq('id', messageId);
        
      if (error) throw error;
      
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setProcessingMessageId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-background">
        <CardHeader className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar>
              {group?.profile_pic ? (
                <AvatarImage src={group.profile_pic} alt={group?.name} />
              ) : (
                <AvatarFallback>{group?.name.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle>{group?.name}</CardTitle>
              <div className="flex items-center gap-2">
                {group?.is_private && (
                  <Badge variant="secondary">Private</Badge>
                )}
                {isAdmin && (
                  <Badge variant="admin">Admin</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Users
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500">
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Permissions
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3 group">
              <UserAvatar 
                userId={message.user_id}
                profilePic={message.profile_pic}
                name={message.user_name}
                accountStatus={message.account_status}
                size="sm"
              />
              <div className="flex-1 max-w-[80%]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{message.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                
                {message.is_deleted ? (
                  <div className="italic text-muted-foreground text-sm">
                    <Trash2 className="h-3 w-3 inline mr-1" />
                    {message.deleted_by_name} deleted this message
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-3">
                    {message.content_type === 'text' && message.content && (
                      <MentionText text={message.content} />
                    )}
                    
                    {message.content_type === 'image' && message.file_url && (
                      <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                        <img src={message.file_url} alt="Uploaded Image" className="max-w-full rounded-md" />
                      </a>
                    )}
                    
                    {message.content_type === 'file' && message.file_url && (
                      <div className="flex items-center justify-between">
                        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <File className="h-4 w-4" />
                          View File
                        </a>
                        <a href={message.file_url} download className="hover:underline">
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {!message.is_deleted && message.user_id === user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)} disabled={processingMessageId === message.id}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <CardContent className="p-4 border-t">
          <div className="flex items-center gap-4">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border-none shadow-none p-0" align="start">
                <EmojiPicker onEmojiClick={handleEmojiSelect} width={320} height={300} />
              </PopoverContent>
            </Popover>
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              className="rounded-full flex-1"
            />
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button variant="ghost" size="icon" disabled={uploading}>
                <Upload className="h-5 w-5" />
              </Button>
            </label>
            <Button onClick={handleSendMessage} disabled={uploading}>
              <Send className="h-5 w-5 mr-2" />
              Send
            </Button>
          </div>
        </CardContent>
      </div>
    </DashboardLayout>
  );
};

export default ChatRoom;
