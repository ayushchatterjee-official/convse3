import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/user/UserAvatar';

interface ChatMessage {
  id: string;
  created_at: string;
  user_id: string;
  content: string;
  group_id: string;
  name: string;
  profile_pic?: string;
  account_status?: 'normal' | 'admin' | 'verified';
}

interface GroupMember {
  user_id: string;
  name: string;
  profile_pic?: string;
  account_status?: 'normal' | 'admin' | 'verified';
}

const ChatRoom = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch initial messages
        const { data: initialMessages, error: messagesError } = await supabase
          .from('group_messages')
          .select('*, profiles(name, profile_pic, account_status)')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        const formattedMessages = initialMessages?.map(msg => ({
          id: msg.id,
          created_at: msg.created_at,
          user_id: msg.user_id,
          content: msg.content,
          group_id: msg.group_id,
          name: msg.profiles?.name || 'Unknown User',
          profile_pic: msg.profiles?.profile_pic,
          account_status: msg.profiles?.account_status
        })) || [];

        setMessages(formattedMessages);

        // Fetch group members
        const { data: groupMembers, error: membersError } = await supabase
          .from('group_members')
          .select('user_id, profiles(name, profile_pic, account_status)')
          .eq('group_id', groupId);

        if (membersError) {
          throw membersError;
        }

        const formattedMembers = groupMembers?.map(member => ({
          user_id: member.user_id,
          name: member.profiles?.name || 'Unknown User',
          profile_pic: member.profiles?.profile_pic,
          account_status: member.profiles?.account_status
        })) || [];

        setMembers(formattedMembers);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load chat room data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscription for new messages
    const messageSubscription = supabase
      .channel('group_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' },
        async (payload) => {
          if (payload.new.group_id === groupId) {
            // Fetch the complete profile data for the new message
            const { data: newMessageData, error: newMessageError } = await supabase
              .from('group_messages')
              .select('*, profiles(name, profile_pic, account_status)')
              .eq('id', payload.new.id)
              .single();

            if (newMessageError) {
              console.error('Error fetching new message details:', newMessageError);
              return;
            }

            const formattedMessage: ChatMessage = {
              id: newMessageData.id,
              created_at: newMessageData.created_at,
              user_id: newMessageData.user_id,
              content: newMessageData.content,
              group_id: newMessageData.group_id,
              name: newMessageData.profiles?.name || 'Unknown User',
              profile_pic: newMessageData.profiles?.profile_pic,
              account_status: newMessageData.profiles?.account_status
            };

            setMessages(prevMessages => [...prevMessages, formattedMessage]);
          }
        }
      )
      .subscribe();

    // Scroll to the bottom on initial load and whenever new messages come in
    scrollToBottom();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [groupId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !groupId || !user) return;

    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          content: newMessage,
          user_id: user.id,
          group_id: groupId,
        });

      if (error) {
        throw error;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading chat...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 h-full flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.user_id === user?.id ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-center">
                {message.user_id !== user?.id && (
                  <UserAvatar 
                    userId={message.user_id}
                    profilePic={message.profile_pic}
                    name={message.name}
                    accountStatus={message.account_status as 'normal' | 'admin' | 'verified'}
                    size="sm"
                  />
                )}
                <div className={`ml-2 mr-2 p-2 rounded-lg ${message.user_id === user?.id ? 'bg-blue-100 dark:bg-blue-900 text-right' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <div className="text-sm font-medium">{message.name}</div>
                  <div className="text-sm">{message.content}</div>
                </div>
                {message.user_id === user?.id && (
                  <UserAvatar 
                    userId={message.user_id}
                    profilePic={message.profile_pic}
                    name={message.name}
                    accountStatus={message.account_status as 'normal' | 'admin' | 'verified'}
                    size="sm"
                  />
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input */}
        <div className="mt-4">
          <div className="flex rounded-md shadow-sm">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter your message..."
              className="rounded-r-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              className="rounded-l-none"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h3 className="text-lg font-semibold mb-3">Group Members</h3>
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between">
                <div className="flex items-center justify-between">
                  <UserAvatar 
                    userId={member.user_id}
                    profilePic={member.profile_pic}
                    name={member.name}
                    accountStatus={member.account_status as 'normal' | 'admin' | 'verified'}
                    showBadgeInline={true}
                    size="sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatRoom;
