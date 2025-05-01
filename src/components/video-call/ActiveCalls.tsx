
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VideoCallCard } from './VideoCallCard';

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
        
        // Get rooms where user is a participant or admin
        const { data, error } = await supabase
          .from('video_call_rooms')
          .select(`
            id, 
            code, 
            admin_id, 
            last_activity,
            (
              SELECT count(*) 
              FROM video_call_participants 
              WHERE room_id = video_call_rooms.id
            ) as participant_count
          `)
          .eq('active', true)
          .or(`admin_id.eq.${user.id},id.in.(
            SELECT room_id FROM video_call_participants WHERE user_id = '${user.id}'
          )`)
          .order('last_activity', { ascending: false });
        
        if (error) throw error;
        
        setActiveRooms(data || []);
      } catch (error) {
        console.error('Error fetching active calls:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
    
    // Subscribe to changes
    const roomsChannel = supabase
      .channel('video_call_rooms_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_rooms' },
        () => fetchRooms()
      )
      .subscribe();
      
    const participantsChannel = supabase
      .channel('video_call_participants_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_participants' },
        () => fetchRooms()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(participantsChannel);
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
