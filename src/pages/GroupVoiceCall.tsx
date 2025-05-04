import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { CallControls } from '@/components/voice-call/CallControls';
import { ChatPanel } from '@/components/voice-call/ChatPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoaderCircle, PhoneCall, Mic, MicOff } from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  profile_pic: string | null;
}

interface CallInfo {
  id: string;
  started_by: string;
  caller_name: string;
  caller_pic: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  profile_pic: string | null;
  emoji?: string;
  emojiTimestamp?: number;
}

const GroupVoiceCall: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    initializeLocalStream,
    joinGroupCall,
    startGroupCall,
    leaveCall,
    currentCallId,
  } = useVoiceCall();

  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [emojis, setEmojis] = useState<{[key: string]: {emoji: string, timestamp: number}}>({}); 

  // Get group info
  useEffect(() => {
    if (!groupId) return;
    
    const fetchGroupInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('id, name, profile_pic')
          .eq('id', groupId)
          .single();
          
        if (error) throw error;
        setGroupInfo(data as GroupInfo);
      } catch (error) {
        console.error('Error fetching group info:', error);
        toast.error('Group not found');
        navigate('/dashboard');
      }
    };
    
    fetchGroupInfo();
  }, [groupId, navigate]);

  // Initialize local stream when needed
  useEffect(() => {
    if (callInProgress && !localStream) {
      initializeLocalStream();
    }
    
    return () => {
      // Stop using the microphone when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callInProgress, localStream, initializeLocalStream]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user || !groupId) return;
    
    // Subscribe to group channel to receive call notifications
    const channel = supabase
      .channel(`group:${groupId}`)
      .on('broadcast', { event: 'call_started' }, async (payload) => {
        // Fetch caller info
        const { data } = await supabase
          .from('profiles')
          .select('name, profile_pic')
          .eq('id', payload.payload.callerId)
          .single();
          
        if (payload.payload.callerId !== user.id && !currentCallId) {
          // Display incoming call notification
          setIncomingCall({
            id: payload.payload.callId,
            started_by: payload.payload.callerId,
            caller_name: data?.name || 'User',
            caller_pic: data?.profile_pic || null
          });
          
          // Play ringtone
          const audio = new Audio('/assets/ringtone.mp3');
          audio.loop = true;
          audio.play().catch(() => console.log('Autoplay prevented'));
          
          // Stop ringtone after 30 seconds if not answered
          setTimeout(() => {
            audio.pause();
            setIncomingCall(null);
          }, 30000);
          
          return () => {
            audio.pause();
          };
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, groupId, currentCallId]);

  // Check for active call
  useEffect(() => {
    if (!groupId || callInProgress) return;
    
    const checkActiveCall = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_active_group_call', {
            p_group_id: groupId
          });
          
        if (!error && data) {
          // There's an active call in the group
          toast.info('There is an active call in this group');
        }
      } catch (error) {
        console.error('Error checking active call:', error);
      }
    };
    
    checkActiveCall();
  }, [groupId, callInProgress]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!currentCallId) return;
    
    try {
      // We need to perform a complex join since voice_call_participants isn't in the TypeScript types yet
      const { data, error } = await supabase
        .from('voice_call_participants')
        .select('id, user_id, joined_at, left_at')
        .eq('call_id', currentCallId)
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
          profile_pic: profiles?.find(profile => profile.id === p.user_id)?.profile_pic || null
        }));
        
        setParticipants(formattedParticipants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error in participants fetch:', error);
    }
  }, [currentCallId]);

  // Listen for participant join/leave events
  useEffect(() => {
    if (!currentCallId) return;
    
    const channel = supabase
      .channel(`call:${currentCallId}`)
      .on('broadcast', { event: 'user_joined' }, () => {
        fetchParticipants();
      })
      .on('broadcast', { event: 'user_left' }, () => {
        fetchParticipants();
      })
      .on('broadcast', { event: 'emoji' }, (payload) => {
        // Store emoji with timestamp for display
        setEmojis(prev => ({
          ...prev,
          [payload.payload.userId]: { 
            emoji: payload.payload.emoji,
            timestamp: Date.now()
          }
        }));
        
        // Remove emoji after 5 seconds
        setTimeout(() => {
          setEmojis(prev => {
            const newEmojis = { ...prev };
            delete newEmojis[payload.payload.userId];
            return newEmojis;
          });
        }, 5000);
      })
      .subscribe();
      
    fetchParticipants();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCallId, fetchParticipants]);

  // Handle starting a new call
  const handleStartCall = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      await initializeLocalStream();
      const callId = await startGroupCall(groupId);
      
      if (callId) {
        setCallInProgress(true);
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining a call
  const handleJoinCall = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      await initializeLocalStream();
      const success = await joinGroupCall(groupId);
      
      if (success) {
        setCallInProgress(true);
      }
    } catch (error) {
      console.error('Failed to join call:', error);
      toast.error('Failed to join call');
    } finally {
      setLoading(false);
    }
  };

  // Handle accepting an incoming call
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    setLoading(true);
    try {
      // Initialize audio stream
      await initializeLocalStream();
      
      // Accept the call
      setCallInProgress(true);
      
      // Join the call
      await joinGroupCall(groupId!);
      
      // Clear incoming call state
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('Failed to accept call');
    } finally {
      setLoading(false);
    }
  };

  // Handle declining an incoming call
  const handleDeclineCall = () => {
    setIncomingCall(null);
  };

  // Handle leaving the call
  const handleLeaveCall = () => {
    leaveCall();
    setCallInProgress(false);
    navigate('/chat/' + groupId);
  };

  // Render the group call page
  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto py-4">
        {callInProgress ? (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                {groupInfo?.profile_pic ? (
                  <Avatar className="h-10 w-10 mr-2">
                    <AvatarImage src={groupInfo.profile_pic} alt={groupInfo.name} />
                  </Avatar>
                ) : (
                  <Avatar className="h-10 w-10 mr-2">
                    <AvatarFallback>
                      {groupInfo?.name?.charAt(0) || 'G'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h2 className="text-xl font-bold">{groupInfo?.name}</h2>
                  <p className="text-sm text-gray-500">Voice Call in Progress</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex">
              <div className={`flex-1 p-4 ${showChat ? 'lg:pr-0' : ''}`}>
                <div className="h-full flex flex-col">
                  {/* Call participants display */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Current user */}
                    <Card className="bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-4 relative">
                      <Avatar className="h-16 w-16 mb-2">
                        {profile?.profile_pic ? (
                          <AvatarImage src={profile.profile_pic} alt={profile.name} />
                        ) : (
                          <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                        )}
                      </Avatar>
                      <p className="font-medium">{profile?.name || 'You'}</p>
                      <div className="mt-2">
                        {isAudioEnabled ? (
                          <Mic className="h-5 w-5 text-green-500" />
                        ) : (
                          <MicOff className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      
                      {/* Emoji display for current user */}
                      {emojis[user?.id ?? ''] && (
                        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full h-10 w-10 flex items-center justify-center text-2xl shadow-md border border-gray-200 dark:border-gray-600">
                          {emojis[user?.id ?? ''].emoji}
                        </div>
                      )}
                    </Card>
                    
                    {/* Other participants */}
                    {participants
                      .filter(p => p.user_id !== user?.id)
                      .map((participant) => (
                        <Card 
                          key={participant.id} 
                          className="bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-4 relative"
                        >
                          <Avatar className="h-16 w-16 mb-2">
                            {participant.profile_pic ? (
                              <AvatarImage src={participant.profile_pic} alt={participant.user_name} />
                            ) : (
                              <AvatarFallback>
                                {participant.user_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <p className="font-medium">{participant.user_name}</p>
                          <div className="mt-2">
                            {remoteStreams.has(participant.user_id) && 
                              remoteStreams.get(participant.user_id)?.getAudioTracks().some(track => track.enabled) ? (
                              <Mic className="h-5 w-5 text-green-500" />
                            ) : (
                              <MicOff className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          
                          {/* Emoji display for this participant */}
                          {emojis[participant.user_id] && (
                            <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full h-10 w-10 flex items-center justify-center text-2xl shadow-md border border-gray-200 dark:border-gray-600">
                              {emojis[participant.user_id].emoji}
                            </div>
                          )}
                        </Card>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Right sidebar for chat */}
              {showChat && (
                <div className="w-full lg:w-80 h-full">
                  <ChatPanel />
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <CallControls
                showChat={showChat}
                setShowChat={setShowChat}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <div className="p-6 text-center">
                <Avatar className="h-20 w-20 mb-4 mx-auto">
                  {groupInfo?.profile_pic ? (
                    <AvatarImage src={groupInfo.profile_pic} alt={groupInfo.name} />
                  ) : (
                    <AvatarFallback>
                      {groupInfo?.name?.charAt(0) || 'G'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="text-2xl font-bold mb-1">{groupInfo?.name}</h2>
                <p className="text-gray-500 mb-6">Start a voice call with this group</p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={handleStartCall} 
                    className="flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <PhoneCall className="h-4 w-4" />
                    )}
                    Start Call
                  </Button>
                  <Button 
                    onClick={handleJoinCall}
                    variant="outline"
                    disabled={loading}
                  >
                    Join Existing Call
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Incoming call dialog */}
      <AlertDialog open={!!incomingCall} onOpenChange={() => incomingCall && setIncomingCall(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incoming Voice Call</AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center">
              <Avatar className="h-16 w-16 mb-2">
                {incomingCall?.caller_pic ? (
                  <AvatarImage src={incomingCall.caller_pic} alt={incomingCall.caller_name} />
                ) : (
                  <AvatarFallback>{incomingCall?.caller_name?.charAt(0) || 'U'}</AvatarFallback>
                )}
              </Avatar>
              <p>{incomingCall?.caller_name} is calling</p>
              <p className="text-sm text-gray-500">from {groupInfo?.name}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeclineCall}>Decline</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAcceptCall}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default GroupVoiceCall;
