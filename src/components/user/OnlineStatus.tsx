
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  userId: string;
  className?: string;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ userId, className }) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  
  useEffect(() => {
    let presenceChannel = supabase.channel('online-users');
    let aborted = false;
    
    const setupPresence = async () => {
      try {
        console.log(`Setting up presence tracking for user ${userId}`);
        
        // Subscribe to the presence channel
        presenceChannel = presenceChannel
          .on('presence', { event: 'sync' }, () => {
            if (aborted) return;
            
            const state = presenceChannel.presenceState();
            console.log('Current presence state:', state);
            
            // Check if the user is in the presence state
            const allPresences = Object.values(state).flat();
            
            const userPresent = allPresences.some(
              (presence: any) => presence.user_id === userId
            );
            
            setIsOnline(userPresent);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            if (aborted) return;
            
            // Check if the joined user is the one we're tracking
            const userJoined = newPresences.some((presence: any) => presence.user_id === userId);
            if (userJoined) {
              setIsOnline(true);
            }
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            if (aborted) return;
            
            // Check if the left user is the one we're tracking
            const userLeft = leftPresences.some((presence: any) => presence.user_id === userId);
            if (userLeft) {
              setIsOnline(false);
            }
          })
          .subscribe();
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };
    
    setupPresence();
    
    // Cleanup
    return () => {
      aborted = true;
      supabase.removeChannel(presenceChannel);
    };
  }, [userId]);
  
  return (
    <div className={cn("absolute bottom-0 right-0", className)}>
      <div className={`h-3 w-3 rounded-full border-2 border-white ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`} />
    </div>
  );
};
