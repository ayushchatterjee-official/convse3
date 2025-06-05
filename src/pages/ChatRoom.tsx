import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Upload, Smile, Phone, Users, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MentionModal } from '@/components/chat/MentionModal';
import { UserProfileModal } from '@/components/user/UserProfileModal';

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  content_type: string;
  created_at: string;
  file_url: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  is_system_message: boolean | null;
  profiles?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  };
}

interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
}

interface Member {
  id: string;
  user_id: string;
  is_admin: boolean;
  profiles?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  };
}

const ChatRoom = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [canStartCall, setCanStartCall] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupDetails();
      fetchMessages();
      fetchMembers();
      subscribeToMessages();
      checkActiveVoiceCall();
    }
  }, [groupId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Error fetching group details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load group details',
          variant: 'destructive',
        });
        return;
      }

      setGroup(data);
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group details',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error fetching members:', error);
        toast({
          title: 'Error',
          description: 'Failed to load members',
          variant: 'destructive',
        });
        return;
      }

      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive',
      });
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          console.log('Message change:', payload);
          fetchMessages(); // Refetch to get profile data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user || !groupId) return;

    setLoading(true);
    try {
      let file_url = null;
      let content_type = 'text';

      if (selectedFile) {
        const fileName = `${user.id}-${Date.now()}-${selectedFile.name}`;
        const filePath = `group-files/${groupId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('group-files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        file_url = `${supabase.supabaseUrl}/storage/v1/object/public/${data.Key}`;
        content_type = selectedFile.type.startsWith('image/')
          ? 'image'
          : selectedFile.type.startsWith('audio/')
          ? 'voice'
          : 'file';
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: newMessage.trim(),
          content_type: content_type,
          file_url: file_url,
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the file input
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user || !groupId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: null,
          file_url: null,
          deleted_by: user.id,
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileModalOpen(true);
  };

  const handleMentionClick = (username: string) => {
    const mentionedUser = members.find(member => member.profiles?.name === username);
    if (mentionedUser) {
      handleUserClick(mentionedUser.user_id);
    } else {
      toast({
        title: 'User Not Found',
        description: `User @${username} not found in this group.`,
        variant: 'destructive',
      });
    }
  };

  const handleUserMention = (user: Member) => {
    setNewMessage(prevMessage => prevMessage + `@${user.profiles?.name || 'unknown'}`);
    setShowMentionModal(false);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const startVoiceCall = async () => {
    if (!groupId || !user) return;
  
    try {
      // Call the Supabase function to create or join the voice call
      const { data, error } = await supabase.functions.invoke('create_group_call', {
        body: {
          p_group_id: groupId,
          p_user_id: user.id,
        },
      });
  
      if (error) {
        console.error('Error starting voice call:', error);
        toast({
          title: 'Error',
          description: 'Failed to start voice call',
          variant: 'destructive',
        });
        return;
      }
  
      // Redirect the user to the voice call page
      window.location.href = `/voice-call/${groupId}`;
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start voice call',
        variant: 'destructive',
      });
    }
  };

  const checkActiveVoiceCall = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase.functions.invoke('get_active_group_call', {
        body: {
          p_group_id: groupId,
        },
      });

      if (error) {
        console.error('Error checking active voice call:', error);
        return;
      }

      // If there's an active call, disable the start call button
      setCanStartCall(!data);
    } catch (error) {
      console.error('Error checking active voice call:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Avatar className="h-10 w-10">
            {group?.profile_pic ? (
              <AvatarImage src={group.profile_pic} alt={group.name} />
            ) : (
              <AvatarFallback>
                {group?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="font-semibold">{group?.name}</h1>
            <p className="text-sm text-gray-600">{members.length} members</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={startVoiceCall}
            disabled={!canStartCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Group Members ({members.length})</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full mt-4">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserClick(member.user_id)}
                    >
                      <Avatar className="h-8 w-8">
                        {member.profiles?.profile_pic ? (
                          <AvatarImage src={member.profiles.profile_pic} alt={member.profiles.name} />
                        ) : (
                          <AvatarFallback>
                            {member.profiles?.name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.profiles?.name || 'Unknown User'}</p>
                        <div className="flex items-center gap-2">
                          {member.is_admin && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                          {member.profiles?.account_status === 'admin' && (
                            <Badge variant="destructive" className="text-xs">Site Admin</Badge>
                          )}
                          {member.profiles?.account_status === 'verified' && (
                            <Badge variant="outline" className="text-xs">Verified</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => {
            const isOwnMessage = message.user_id === user?.id;
            const isSystemMessage = message.is_system_message;
            
            if (message.is_deleted) {
              return (
                <div key={message.id} className="flex justify-center py-2">
                  <span className="text-sm text-gray-500 italic">
                    This message was deleted by {message.deleted_by === user?.id ? 'you' : message.profiles?.name || 'Unknown User'}
                  </span>
                </div>
              );
            }

            if (isSystemMessage) {
              return (
                <div key={message.id} className="flex justify-center py-2">
                  <Badge variant="secondary" className="text-xs">
                    {message.content}
                  </Badge>
                </div>
              );
            }

            const renderMessageContent = (content: string) => {
              // Enhanced @ mention regex to match @username format
              const mentionRegex = /@(\w+)/g;
              const parts = content.split(mentionRegex);
              
              return parts.map((part, index) => {
                if (index % 2 === 1) {
                  // This is a username (odd indices after split)
                  return (
                    <span
                      key={index}
                      className="text-blue-600 font-medium cursor-pointer hover:text-blue-800"
                      onClick={() => handleMentionClick(part)}
                    >
                      @{part}
                    </span>
                  );
                }
                return <span key={index}>{part}</span>;
              });
            };

            return (
              <div key={message.id} className={`flex gap-3 p-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                <div
                  className="cursor-pointer"
                  onClick={() => handleUserClick(message.user_id)}
                >
                  <Avatar className="h-8 w-8">
                    {message.profiles?.profile_pic ? (
                      <AvatarImage src={message.profiles.profile_pic} alt={message.profiles.name} />
                    ) : (
                      <AvatarFallback>
                        {message.profiles?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className={`flex-1 max-w-xs sm:max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                    <span
                      className="font-medium text-sm cursor-pointer"
                      onClick={() => handleUserClick(message.user_id)}
                    >
                      {message.profiles?.name || 'Unknown User'}
                    </span>
                    {message.profiles?.account_status === 'admin' && (
                      <Badge variant="destructive" className="text-xs">Admin</Badge>
                    )}
                    {message.profiles?.account_status === 'verified' && (
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className={`rounded-lg p-3 ${
                    isOwnMessage 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.content && (
                      <p className="text-sm break-words">
                        {renderMessageContent(message.content)}
                      </p>
                    )}
                    {message.file_url && (
                      <div className="mt-2">
                        {message.content_type === 'image' ? (
                          <img 
                            src={message.file_url} 
                            alt="Shared image" 
                            className="max-w-full rounded cursor-pointer"
                            onClick={() => window.open(message.file_url, '_blank')}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <a 
                              href={message.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              📎 {message.content_type === 'voice' ? 'Voice Message' : 'File'}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(isOwnMessage || profile?.account_status === 'admin') && (
                    <div className={`flex gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMessage(message.id)}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setNewMessage(prev => prev + emojiObject.emoji);
                }}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={sendMessage} disabled={loading || (!newMessage.trim() && !selectedFile)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MentionModal
        isOpen={showMentionModal}
        onClose={() => setShowMentionModal(false)}
        members={members}
        onSelectUser={handleUserMention}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
};

export default ChatRoom;
