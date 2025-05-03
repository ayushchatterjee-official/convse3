
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
import { VideoCallParticipant, JoinRequest } from '@/models/VideoCallRoom';

export const ParticipantList: React.FC<{
  roomId: string;
  isAdmin: boolean;
}> = ({ roomId, isAdmin }) => {
  const { user } = useAuth();
  const { remoteStreams, peerConnections } = useVideoCall();
  const [participants, setParticipants] = useState<VideoCallParticipant[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  
  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Call the get_room_participants function
        const { data, error } = await supabase
          .rpc('get_room_participants', { room_id_param: roomId });
        
        if (error) {
          console.error('Error fetching participants:', error);
          return;
        }
        
        setParticipants(data as VideoCallParticipant[] || []);
      } catch (error) {
        console.error('Error in participants fetch:', error);
      }
    };
    
    fetchParticipants();
    
    // Poll for changes instead of using realtime
    const intervalId = setInterval(fetchParticipants, 3000);
      
    return () => {
      clearInterval(intervalId);
    };
  }, [roomId]);
  
  // Fetch join requests if user is admin
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchJoinRequests = async () => {
      try {
        // Call the get_room_join_requests function
        const { data, error } = await supabase
          .rpc('get_room_join_requests', { room_id_param: roomId });
        
        if (error) {
          console.error('Error fetching join requests:', error);
          return;
        }
        
        setJoinRequests(data as JoinRequest[] || []);
      } catch (error) {
        console.error('Error in join requests fetch:', error);
      }
    };
    
    fetchJoinRequests();
    
    // Poll for changes instead of using realtime - use shorter interval for better responsiveness
    const intervalId = setInterval(fetchJoinRequests, 2000);
      
    return () => {
      clearInterval(intervalId);
    };
  }, [roomId, isAdmin]);
  
  // Handle join request approval/rejection
  const handleJoinRequest = async (requestId: string, approve: boolean) => {
    try {
      // Call the handle_join_request function
      const { data: success, error } = await supabase
        .rpc('handle_join_request', { 
          request_id_param: requestId,
          approve: approve 
        });
      
      if (error || !success) {
        throw error || new Error('Failed to process request');
      }
      
      // Remove the request from the list
      setJoinRequests(prevRequests => 
        prevRequests.filter(request => request.id !== requestId)
      );
      
      // If approved, refresh participants list
      if (approve) {
        const { data, error: participantsError } = await supabase
          .rpc('get_room_participants', { room_id_param: roomId });
        
        if (!participantsError && data) {
          setParticipants(data as VideoCallParticipant[]);
        }
      }
      
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
                      {request.profile_pic ? (
                        <AvatarImage src={request.profile_pic} />
                      ) : (
                        <AvatarFallback>
                          {request.user_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span>{request.user_name || 'Unknown User'}</span>
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
