
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
            console.log('All presences:', allPresences);
            
            const userPresent = allPresences.some(
              (presence: any) => presence.user_id === userId
            );
            
            console.log(`User ${userId} presence:`, userPresent);
            setIsOnline(userPresent);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            if (aborted) return;
            
            console.log('Join event:', newPresences);
            // Check if the joined user is the one we're tracking
            const userJoined = newPresences.some((presence: any) => presence.user_id === userId);
            if (userJoined) {
              console.log(`User ${userId} joined`);
              setIsOnline(true);
            }
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            if (aborted) return;
            
            console.log('Leave event:', leftPresences);
            // Check if the left user is the one we're tracking
            const userLeft = leftPresences.some((presence: any) => presence.user_id === userId);
            if (userLeft) {
              console.log(`User ${userId} left`);
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
      {isOnline ? (
        <CircleDot className="text-green-500 h-3 w-3 fill-green-500" />
      ) : (
        <Circle className="text-gray-400 h-3 w-3" />
      )}
    </div>
  );
};
