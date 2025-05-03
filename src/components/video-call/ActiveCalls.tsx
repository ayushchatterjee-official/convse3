
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VideoCallCard } from './VideoCallCard';
import { toast } from 'sonner';

interface RoomData {
  id: string;
  code: string;
  admin_id: string;
  last_activity: string;
  participant_count: number;
}

export const ActiveCalls: React.FC = () => {
  const { user } = useAuth();
  const [activeRooms, setActiveRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      try {
        setLoading(true);
        
        // Since we don't have the RPC function yet, we'll use a direct query
        const { data, error } = await supabase
          .from('video_call_rooms')
          .select('id, code, admin_id, last_activity, active')
          .eq('active', true)
          .order('last_activity', { ascending: false });
        
        if (error) {
          console.error('Error fetching active calls:', error);
          toast.error('Failed to load active calls');
          setActiveRooms([]);
          return;
        }
        
        // For each room, fetch the participant count
        const roomsWithCount = await Promise.all(
          (data || []).map(async (room) => {
            const { count, error: countError } = await supabase
              .from('video_call_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);
            
            return {
              ...room,
              participant_count: count || 0
            };
          })
        );
        
        setActiveRooms(roomsWithCount);
      } catch (error) {
        console.error('Error fetching active calls:', error);
        toast.error('Failed to load active calls');
        setActiveRooms([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
    
    // Set up a polling mechanism instead of subscribing to changes
    const intervalId = setInterval(fetchRooms, 10000); // Poll every 10 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[140px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
        <div className="h-[140px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
      </div>
    );
  }

  if (activeRooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No active video calls</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeRooms.map((room) => (
        <VideoCallCard
          key={room.id}
          roomCode={room.code}
          isAdmin={room.admin_id === user?.id}
          participantCount={room.participant_count}
          lastActivity={room.last_activity}
        />
      ))}
    </div>
  );
};
