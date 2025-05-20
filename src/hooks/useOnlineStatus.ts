
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineStatus = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    // Create a channel for user presence
    const channel = supabase.channel('online-users');
    
    // Track presence for the current user
    const setupPresence = async () => {
      try {
        await channel.subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;
          
          console.log('Presence channel subscribed, tracking user presence');
          
          // Send the user's status
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          
          setIsOnline(true);
        });
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };
    
    setupPresence();
    
    // Set up a heartbeat to maintain presence
    const heartbeat = setInterval(async () => {
      if (channel) {
        try {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error updating presence:', error);
        }
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  return isOnline;
};
