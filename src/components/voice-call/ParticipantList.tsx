
import React, { useEffect, useState, useCallback } from 'react';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  profile_pic: string | null;
  joined_at: string;
}

export const ParticipantList: React.FC<{
  callId: string;
}> = ({ callId }) => {
  const { user } = useAuth();
  const { remoteStreams, peerConnections, isAudioEnabled } = useVoiceCall();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      // We need to perform a complex join since voice_call_participants isn't in the TypeScript types yet
      const { data, error } = await supabase
        .from('voice_call_participants')
        .select('id, user_id, joined_at, left_at')
        .eq('call_id', callId)
        .is('left_at', null);
      
      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }
      
      // Get user profiles for each participant
      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, profile_pic')
          .in('id', userIds);
          
        const formattedParticipants: Participant[] = data.map(p => ({
          id: p.id,
          user_id: p.user_id,
          user_name: profiles?.find(profile => profile.id === p.user_id)?.name || 'Unknown User',
          profile_pic: profiles?.find(profile => profile.id === p.user_id)?.profile_pic || null,
          joined_at: p.joined_at
        }));
        
        setParticipants(formattedParticipants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error in participants fetch:', error);
    }
  }, [callId]);
  
  useEffect(() => {
    fetchParticipants();
    
    // Poll for changes
    const intervalId = setInterval(fetchParticipants, 2000);
      
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchParticipants, refreshTrigger]);
  
  // Listen for participant join/leave events
  useEffect(() => {
    const channel = supabase
      .channel(`call:${callId}`)
      .on('broadcast', { event: 'user_joined' }, () => {
        setRefreshTrigger(prev => prev + 1);
      })
      .on('broadcast', { event: 'user_left' }, () => {
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);
  
  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <h3 className="font-semibold">Participants ({participants.length})</h3>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {participants.map((participant) => {
            const isCurrentUser = participant.user_id === user?.id;
            const remoteStream = remoteStreams.get(participant.user_id);
            const connection = peerConnections.get(participant.user_id);
            const isAudioActive = isCurrentUser ? isAudioEnabled : 
              (connection?.stream?.getAudioTracks().some(track => track.enabled) ?? true);
            
            return (
              <div 
                key={participant.id} 
                className="flex items-center justify-between border rounded-md p-2"
              >
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    {participant.profile_pic ? (
                      <AvatarImage src={participant.profile_pic} />
                    ) : (
                      <AvatarFallback>
                        {participant.user_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <span>{participant.user_name || 'Unknown User'}</span>
                      {isCurrentUser && (
                        <span className="text-xs text-gray-500 ml-1">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {isAudioActive ? (
                        <Mic className="h-3 w-3 text-gray-500" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
