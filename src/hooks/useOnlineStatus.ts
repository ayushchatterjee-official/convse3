
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineStatus = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    // Create a channel for user presence
    const channel = supabase.channel('online-users');
    
    // Track presence for the current user
    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      
      // Send the user's status
      await channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });
    });
    
    // Set up a heartbeat to maintain presence
    const heartbeat = setInterval(async () => {
      if (channel) {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user]);
};
