
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
import { Send, Image, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CommunityMessage {
  id: string;
  type: string;
  user_id: string;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  profiles?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  } | null;
}

const Community = () => {
  const { user, profile, isAdmin } = useAuth();
  const [publicMessages, setPublicMessages] = useState<CommunityMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'admin'>('public');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [publicMessages, adminMessages]);

  const fetchMessages = async () => {
    try {
      // Fetch public messages
      const { data: publicData, error: publicError } = await supabase
        .from('community_chats')
        .select(`
          id,
          type,
          user_id,
          message,
          media_url,
          media_type,
          created_at,
          profiles!community_chats_user_id_fkey (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('type', 'public')
        .order('created_at', { ascending: true });

      if (publicError) {
        console.error('Public messages error:', publicError);
        // Fallback query without profiles join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('community_chats')
          .select('*')
          .eq('type', 'public')
          .order('created_at', { ascending: true });
        
        if (fallbackError) throw fallbackError;
        setPublicMessages(fallbackData || []);
      } else {
        setPublicMessages(publicData || []);
      }

      // Fetch admin messages if user is admin or has sent admin messages
      if (isAdmin || user) {
        const { data: adminData, error: adminError } = await supabase
          .from('community_chats')
          .select(`
            id,
            type,
            user_id,
            message,
            media_url,
            media_type,
            created_at,
            profiles!community_chats_user_id_fkey (
              name,
              profile_pic,
              account_status
            )
          `)
          .eq('type', 'admin')
          .order('created_at', { ascending: true });

        if (adminError) {
          console.error('Admin messages error:', adminError);
          // Fallback query without profiles join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('community_chats')
            .select('*')
            .eq('type', 'admin')
            .order('created_at', { ascending: true });
          
          if (fallbackError) throw fallbackError;
          setAdminMessages(fallbackData || []);
        } else {
          setAdminMessages(adminData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
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
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('community_chats')
        .insert({
          type: activeTab,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Only allow images in public chat
    if (activeTab === 'public' && !file.type.startsWith('image/')) {
      toast.error('Only images are allowed in public chat');
      return;
    }

    setIsLoading(true);
    try {
      // Here you would upload to storage and get the URL
      // For now, we'll just show a placeholder
      toast.info('File upload feature coming soon');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: CommunityMessage) => (
    <div key={message.id} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.profiles?.profile_pic || ''} />
        <AvatarFallback>
          {message.profiles?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {message.profiles?.name || 'Unknown User'}
          </span>
          {message.profiles?.account_status === 'admin' && (
            <Badge variant="secondary" className="text-xs">Admin</Badge>
          )}
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
        {message.message && (
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
            {message.message}
          </p>
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
                className="text-blue-500 hover:underline"
              >
                📎 {message.media_url.split('/').pop()}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const currentMessages = activeTab === 'public' ? publicMessages : adminMessages;

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Community</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Connect with the community and get support
            </p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
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

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-1">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  currentMessages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Type your message...`}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={isLoading}
                  />
                  {activeTab === 'public' && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {activeTab === 'public' && (
                <p className="text-xs text-gray-500 mt-2">
                  Public chat: Text messages and images only
                </p>
              )}
              {activeTab === 'admin' && (
                <p className="text-xs text-gray-500 mt-2">
                  Private chat with administrators
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Community;
