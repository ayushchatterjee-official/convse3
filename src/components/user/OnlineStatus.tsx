
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Circle, CircleDot } from 'lucide-react';
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
    
    // First, check if the user is already online
    const checkInitialStatus = async () => {
      try {
        // Subscribe to the presence channel
        presenceChannel = presenceChannel
          .on('presence', { event: 'sync' }, () => {
            if (aborted) return;
            const state = presenceChannel.presenceState();
            
            // Check if the user is in the presence state
            const userPresent = Object.keys(state).some(key => {
              return state[key].some((presence: any) => presence.user_id === userId);
            });
            
            setIsOnline(userPresent);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (aborted) return;
            // Check if the joined user is the one we're tracking
            const userJoined = newPresences.some((presence: any) => presence.user_id === userId);
            if (userJoined) {
              setIsOnline(true);
            }
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            if (aborted) return;
            // Check if the left user is the one we're tracking
            const userLeft = leftPresences.some((presence: any) => presence.user_id === userId);
            if (userLeft) {
              setIsOnline(false);
            }
          })
          .subscribe();

      } catch (error) {
        console.error('Error checking online status:', error);
      }
    };
    
    checkInitialStatus();
    
    // Cleanup
    return () => {
      aborted = true;
      supabase.removeChannel(presenceChannel);
    };
  }, [userId]);
  
  return (
    <div className={cn("relative", className)}>
      {isOnline ? (
        <CircleDot className="text-green-500 absolute bottom-0 right-0 h-3 w-3 drop-shadow-md" />
      ) : (
        <Circle className="text-gray-400 absolute bottom-0 right-0 h-3 w-3 drop-shadow-md" />
      )}
    </div>
  );
};
