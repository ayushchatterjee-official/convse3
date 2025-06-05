
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Upload, Image, Shield, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserProfileModal } from '@/components/user/UserProfileModal';

interface CommunityMessage {
  id: string;
  type: 'public' | 'admin';
  user_id: string;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  profiles?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  };
}

const Community = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('public');
  const [publicMessages, setPublicMessages] = useState<CommunityMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [publicMessages, adminMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      // Fetch public messages
      const { data: publicData, error: publicError } = await supabase
        .from('community_chats')
        .select(`
          *,
          profiles (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('type', 'public')
        .order('created_at', { ascending: true });

      if (publicError) throw publicError;

      // Fetch admin messages
      const { data: adminData, error: adminError } = await supabase
        .from('community_chats')
        .select(`
          *,
          profiles (
            name,
            profile_pic,
            account_status
          )
        `)
        .eq('type', 'admin')
        .order('created_at', { ascending: true });

      if (adminError) throw adminError;

      setPublicMessages(publicData || []);
      setAdminMessages(adminData || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('community_chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_chats',
        },
        (payload) => {
          console.log('Community message change:', payload);
          fetchMessages(); // Refetch to get profile data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('community_chats')
        .insert({
          type: activeTab as 'public' | 'admin',
          user_id: user.id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Only allow images in public chat
    if (activeTab === 'public' && !file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Only images are allowed in public chat',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just show a placeholder since we don't have storage configured
      toast({
        title: 'Info',
        description: 'File upload feature will be available soon',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileModalOpen(true);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'verified':
        return <Badge variant="secondary" className="text-xs">Verified</Badge>;
      default:
        return null;
    }
  };

  const renderMessage = (msg: CommunityMessage) => (
    <div key={msg.id} className="flex gap-3 p-3 hover:bg-gray-50">
      <div
        className="cursor-pointer"
        onClick={() => handleUserClick(msg.user_id)}
      >
        <Avatar className="h-8 w-8">
          {msg.profiles?.profile_pic ? (
            <AvatarImage src={msg.profiles.profile_pic} alt={msg.profiles.name} />
          ) : (
            <AvatarFallback>
              {msg.profiles?.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-medium cursor-pointer hover:underline"
            onClick={() => handleUserClick(msg.user_id)}
          >
            {msg.profiles?.name || 'Unknown User'}
          </span>
          {msg.profiles?.account_status && getAccountStatusBadge(msg.profiles.account_status)}
          <span className="text-xs text-gray-500">
            {formatTime(msg.created_at)}
          </span>
        </div>
        {msg.message && (
          <p className="text-sm text-gray-800">{msg.message}</p>
        )}
        {msg.media_url && (
          <div className="mt-2">
            {msg.media_type?.startsWith('image/') ? (
              <img
                src={msg.media_url}
                alt="Shared media"
                className="max-w-xs rounded-lg border"
              />
            ) : (
              <div className="p-2 border rounded-lg bg-gray-50">
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  📎 {msg.media_type || 'File'}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const currentMessages = activeTab === 'public' ? publicMessages : adminMessages;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Community</h1>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm text-gray-600">
              {activeTab === 'public' ? 'Public Chat' : 'Talk with Admin'}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Public
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Talk with Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="mt-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Public Community Chat</CardTitle>
                <p className="text-sm text-gray-600">
                  Welcome to the public community! Share images and chat with everyone.
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-1">
                    {currentMessages.map(renderMessage)}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="mt-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Talk with Admin</CardTitle>
                <p className="text-sm text-gray-600">
                  Private conversation with administrators. Your messages are only visible to you and admins.
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-1">
                    {currentMessages.map(renderMessage)}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message to admin..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedUserId}
      />
    </DashboardLayout>
  );
};

export default Community;
