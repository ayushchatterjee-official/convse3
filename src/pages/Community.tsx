
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Image, Users, MessageSquare, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MentionModal } from '@/components/chat/MentionModal';
import { UserProfileModal } from '@/components/user/UserProfileModal';
import { PrivateMessagesList } from '@/components/chat/PrivateMessagesList';
import { uploadFile, getFileType } from '@/lib/fileUpload';

interface CommunityMessage {
  id: string;
  type: string;
  user_id: string;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_profile?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  } | null;
}

const Community = () => {
  const { user, profile, isAdmin } = useAuth();
  const [publicMessages, setPublicMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'admin'>('public');
  const [isLoading, setIsLoading] = useState(false);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [publicMessages]);

  const fetchPublicMessages = async () => {
    try {
      const { data: publicData, error: publicError } = await supabase
        .from('community_chats')
        .select('*')
        .eq('type', 'public')
        .order('created_at', { ascending: true });

      if (publicError) {
        console.error('Public messages error:', publicError);
        setPublicMessages([]);
      } else if (publicData) {
        const userIds = [...new Set(publicData.map(msg => msg.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, profile_pic, account_status')
          .in('id', userIds);

        const messagesWithProfiles = publicData.map(msg => ({
          ...msg,
          user_profile: profilesData?.find(p => p.id === msg.user_id) || null
        }));
        setPublicMessages(messagesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  useEffect(() => {
    fetchPublicMessages();

    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_chats'
        },
        () => {
          fetchPublicMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      if (activeTab === 'public') {
        const { error } = await supabase
          .from('community_chats')
          .insert({
            type: activeTab,
            user_id: user.id,
            message: newMessage.trim()
          });

        if (error) throw error;
      } else {
        // For admin tab, create or find conversation and send private message
        await sendPrivateMessage(newMessage.trim());
      }
      
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPrivateMessage = async (message: string) => {
    if (!user) return;

    try {
      // Extract mentions from message and format names
      const mentionRegex = /@([A-Za-z0-9\s\-_]+)/g;
      const mentions: string[] = [];
      let formattedMessage = message;

      // Replace mentions with proper formatting
      formattedMessage = message.replace(mentionRegex, (match, name) => {
        const formattedName = name.trim().replace(/\s+/g, '-');
        // Here you would normally resolve the name to user ID
        // For now, we'll store the formatted name
        mentions.push(formattedName);
        return `@${formattedName}`;
      });

      let conversationId = null;

      if (isAdmin) {
        // Admin sending to mentioned users
        const { error } = await supabase
          .from('admin_private_messages')
          .insert({
            sender_id: user.id,
            message: formattedMessage,
            mentions: mentions.length > 0 ? mentions : null
          });

        if (error) throw error;
      } else {
        // Regular user sending to admin - create or find conversation
        const { data: existingConversation } = await supabase
          .from('admin_conversations')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          // Create new conversation - admin_id will be null for now
          const { data: newConversation, error: convError } = await supabase
            .from('admin_conversations')
            .insert({
              user_id: user.id,
              admin_id: user.id, // Temporary, should be updated by admin
              subject: 'User Query'
            })
            .select('id')
            .single();

          if (convError) throw convError;
          conversationId = newConversation.id;
        }

        const { error } = await supabase
          .from('admin_private_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: formattedMessage
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error sending private message:', error);
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileType = getFileType(file);
      const folderPath = `${user.id}`;
      
      const fileUrl = await uploadFile(file, 'community-media', folderPath);
      
      if (fileUrl) {
        if (activeTab === 'public') {
          const { error } = await supabase
            .from('community_chats')
            .insert({
              type: activeTab,
              user_id: user.id,
              media_url: fileUrl,
              media_type: file.type
            });

          if (error) throw error;
        } else {
          // For admin tab, send as private message with media
          const { error } = await supabase
            .from('admin_private_messages')
            .insert({
              sender_id: user.id,
              media_url: fileUrl,
              media_type: file.type
            });

          if (error) throw error;
        }
        
        toast.success('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMention = () => {
    setShowMentionModal(true);
  };

  const handleSelectUser = (selectedUser: { id: string; name: string }) => {
    const formattedName = selectedUser.name.replace(/\s+/g, '-');
    setNewMessage(prev => prev + `@${formattedName} `);
  };

  const handleUsernameClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const renderMessage = (message: CommunityMessage) => {
    const messageText = message.message || '';
    
    // Parse mentions in message
    const mentionRegex = /@([A-Za-z0-9\-_]+)/g;
    const parts = messageText.split(mentionRegex);
    
    const renderMessageContent = () => {
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a mention - convert hyphens back to spaces for display
          const displayName = part.replace(/-/g, ' ');
          return (
            <span
              key={index}
              className="text-blue-500 cursor-pointer hover:underline font-medium"
              onClick={() => {
                toast.info(`Mentioned: ${displayName}`);
              }}
            >
              @{displayName}
            </span>
          );
        }
        return part;
      });
    };

    return (
      <div key={message.id} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <Avatar 
          className="h-8 w-8 cursor-pointer flex-shrink-0"
          onClick={() => handleUsernameClick(message.user_id)}
        >
          <AvatarImage src={message.user_profile?.profile_pic || ''} />
          <AvatarFallback>
            {message.user_profile?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="font-medium text-sm cursor-pointer hover:underline"
              onClick={() => handleUsernameClick(message.user_id)}
            >
              {message.user_profile?.name || 'Unknown User'}
            </span>
            {message.user_profile?.account_status === 'admin' && (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            )}
            <span className="text-xs text-gray-500">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
          {message.message && (
            <div className="text-sm mt-1 text-gray-700 dark:text-gray-300 break-words">
              {renderMessageContent()}
            </div>
          )}
          {message.media_url && (
            <div className="mt-2">
              {message.media_type?.startsWith('image/') ? (
                <img 
                  src={message.media_url} 
                  alt="Shared media" 
                  className="max-w-xs rounded-lg"
                />
              ) : (
                <a 
                  href={message.media_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline break-all"
                >
                  📎 {message.media_url.split('/').pop()}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full flex flex-col max-h-screen">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Community</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Connect with the community and get support
            </p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'admin')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="public" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Public Chat
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Talk with Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-1">
                {activeTab === 'public' ? (
                  publicMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    publicMessages.map(renderMessage)
                  )
                ) : (
                  user && (
                    <PrivateMessagesList 
                      userId={user.id} 
                      isAdmin={isAdmin} 
                      onUserProfileClick={handleUsernameClick}
                    />
                  )
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4 flex-shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={activeTab === 'public' ? 'Type your message...' : 'Send a private message to admin...'}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={isLoading}
                    className="break-words"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleMention}
                    disabled={isLoading}
                    title="Mention someone"
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    title="Upload file"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim() || isUploading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {activeTab === 'public' 
                    ? 'Public chat: Messages visible to everyone'
                    : 'Private chat: Only you and admins can see these messages'
                  }
                </p>
                {isUploading && (
                  <p className="text-xs text-blue-500">Uploading...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MentionModal
        isOpen={showMentionModal}
        onClose={() => setShowMentionModal(false)}
        onSelectUser={handleSelectUser}
        groupId="community"
      />

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={selectedUserId}
      />
    </DashboardLayout>
  );
};

export default Community;
