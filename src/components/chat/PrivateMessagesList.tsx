
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PrivateMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  mentions: string[] | null;
  created_at: string;
  conversation_id: string | null;
  sender_profile?: {
    name: string;
    profile_pic: string | null;
    account_status: string;
  } | null;
}

interface PrivateMessagesListProps {
  userId: string;
  isAdmin: boolean;
  onUserProfileClick: (userId: string) => void;
}

export const PrivateMessagesList = ({ userId, isAdmin, onUserProfileClick }: PrivateMessagesListProps) => {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivateMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-private-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_private_messages'
        },
        () => {
          fetchPrivateMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin]);

  const fetchPrivateMessages = async () => {
    try {
      setLoading(true);
      
      const { data: messagesData, error } = await supabase
        .from('admin_private_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (messagesData && messagesData.length > 0) {
        // Fetch profiles for messages
        const userIds = [...new Set(messagesData.map(msg => msg.sender_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, profile_pic, account_status')
          .in('id', userIds);

        const messagesWithProfiles = messagesData.map(msg => ({
          ...msg,
          sender_profile: profilesData?.find(p => p.id === msg.sender_id) || null
        }));

        setMessages(messagesWithProfiles);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching private messages:', error);
      toast.error('Failed to load private messages');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message: PrivateMessage) => {
    const messageText = message.message || '';
    
    // Parse mentions in message with hyphen formatting
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
                // Find user by formatted name for mention click
                const mentionedUserId = message.mentions?.find(id => {
                  // This would need proper user lookup logic
                  return true; // Simplified for now
                });
                if (mentionedUserId) {
                  onUserProfileClick(mentionedUserId);
                }
              }}
            >
              @{displayName}
            </span>
          );
        }
        return part;
      });
    };

    // Check if current user should see this message
    const canSeeMessage = isAdmin || 
                         message.sender_id === userId || 
                         message.recipient_id === userId ||
                         (message.mentions && message.mentions.includes(userId));

    if (!canSeeMessage) {
      return null;
    }

    return (
      <div key={message.id} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-blue-200">
        <Avatar 
          className="h-8 w-8 cursor-pointer"
          onClick={() => onUserProfileClick(message.sender_id)}
        >
          <AvatarImage src={message.sender_profile?.profile_pic || ''} />
          <AvatarFallback>
            {message.sender_profile?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="font-medium text-sm cursor-pointer hover:underline"
              onClick={() => onUserProfileClick(message.sender_id)}
            >
              {message.sender_profile?.name || 'Unknown User'}
            </span>
            {message.sender_profile?.account_status === 'admin' && (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            )}
            <span className="text-xs text-gray-500">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            <Badge variant="outline" className="text-xs">Private</Badge>
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

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading private messages...</div>;
  }

  const visibleMessages = messages.filter(msg => {
    return isAdmin || 
           msg.sender_id === userId || 
           msg.recipient_id === userId ||
           (msg.mentions && msg.mentions.includes(userId));
  });

  if (visibleMessages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No private messages yet.</div>
        {!isAdmin && (
          <div className="text-xs mt-2">Send a message to start a conversation with admins.</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visibleMessages.map(renderMessage)}
    </div>
  );
};
