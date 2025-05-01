
import React, { useEffect, useState } from 'react';
import { useVideoCall } from '@/contexts/VideoCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mic, MicOff, Video, VideoOff, CheckCircle, XCircle } from 'lucide-react';

interface Participant {
  user_id: string;
  is_admin: boolean;
  approved: boolean;
  profiles?: {
    name: string;
    profile_pic: string | null;
  } | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  profiles?: {
    name: string;
    profile_pic: string | null;
  } | null;
}

export const ParticipantList: React.FC<{
  roomId: string;
  isAdmin: boolean;
}> = ({ roomId, isAdmin }) => {
  const { user } = useAuth();
  const { remoteStreams, peerConnections } = useVideoCall();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  
  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('video_call_participants')
        .select(`
          user_id,
          is_admin,
          approved,
          profiles:user_id (
            name,
            profile_pic
          )
        `)
        .eq('room_id', roomId);
        
      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }
      
      setParticipants(data || []);
    };
    
    fetchParticipants();
    
    // Subscribe to participant changes
    const channel = supabase
      .channel(`room:${roomId}:participants`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_participants', filter: `room_id=eq.${roomId}` },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  
  // Fetch join requests if user is admin
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchJoinRequests = async () => {
      const { data, error } = await supabase
        .from('video_call_join_requests')
        .select(`
          id,
          user_id,
          profiles:user_id (
            name,
            profile_pic
          )
        `)
        .eq('room_id', roomId)
        .eq('status', 'pending');
        
      if (error) {
        console.error('Error fetching join requests:', error);
        return;
      }
      
      setJoinRequests(data || []);
    };
    
    fetchJoinRequests();
    
    // Subscribe to join request changes
    const channel = supabase
      .channel(`room:${roomId}:join_requests`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_join_requests', filter: `room_id=eq.${roomId}` },
        () => {
          fetchJoinRequests();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isAdmin]);
  
  // Handle join request approval/rejection
  const handleJoinRequest = async (requestId: string, approve: boolean) => {
    try {
      if (approve) {
        // Get the join request to access the user_id
        const { data: requestData, error: requestError } = await supabase
          .from('video_call_join_requests')
          .select('user_id')
          .eq('id', requestId)
          .single();
        
        if (requestError) throw requestError;
        
        // Add participant
        const { error: participantError } = await supabase
          .from('video_call_participants')
          .upsert({
            user_id: requestData.user_id,
            room_id: roomId,
            joined_at: new Date().toISOString(),
            approved: true
          });
        
        if (participantError) throw participantError;
      }
      
      // Update request status
      const { error } = await supabase
        .from('video_call_join_requests')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success(`User ${approve ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Error handling join request:', error);
      toast.error('Failed to process join request');
    }
  };
  
  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <h3 className="font-semibold">Participants ({participants.length})</h3>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        {isAdmin && joinRequests.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Join Requests</h4>
            <div className="space-y-2">
              {joinRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      {request.profiles?.profile_pic ? (
                        <AvatarImage src={request.profiles.profile_pic} />
                      ) : (
                        <AvatarFallback>
                          {request.profiles?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span>{request.profiles?.name || 'Unknown User'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleJoinRequest(request.id, true)}
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleJoinRequest(request.id, false)}
                    >
                      <XCircle className="h-4 w-4 text-red-500 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {participants.map((participant) => {
            const isCurrentUser = participant.user_id === user?.id;
            const remoteStream = remoteStreams.get(participant.user_id);
            const connection = peerConnections.get(participant.user_id);
            const isAudioActive = connection?.stream?.getAudioTracks().some(track => track.enabled) ?? true;
            const isVideoActive = connection?.stream?.getVideoTracks().some(track => track.enabled) ?? true;
            
            return (
              <div 
                key={participant.user_id} 
                className="flex items-center justify-between border rounded-md p-2"
              >
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    {participant.profiles?.profile_pic ? (
                      <AvatarImage src={participant.profiles.profile_pic} />
                    ) : (
                      <AvatarFallback>
                        {participant.profiles?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <span>{participant.profiles?.name || 'Unknown User'}</span>
                      {isCurrentUser && (
                        <span className="text-xs text-gray-500 ml-1">(You)</span>
                      )}
                      {participant.is_admin && (
                        <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                      )}
                    </div>
                    {remoteStream && (
                      <div className="flex items-center gap-2 mt-1">
                        {isAudioActive ? (
                          <Mic className="h-3 w-3 text-gray-500" />
                        ) : (
                          <MicOff className="h-3 w-3 text-red-500" />
                        )}
                        {isVideoActive ? (
                          <Video className="h-3 w-3 text-gray-500" />
                        ) : (
                          <VideoOff className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    )}
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
