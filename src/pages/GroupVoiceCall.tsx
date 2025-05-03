
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { CallControls } from '@/components/voice-call/CallControls';
import { ChatPanel } from '@/components/voice-call/ChatPanel';
import { ParticipantList } from '@/components/voice-call/ParticipantList';
import { ScreenShareView } from '@/components/voice-call/ScreenShareView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoaderCircle, PhoneCall, Mic } from 'lucide-react';

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

const GroupVoiceCall: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isSharingScreen,
    initializeLocalStream,
    joinGroupCall,
    startGroupCall,
    leaveCall,
    currentCallId,
  } = useVoiceCall();

  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);

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
          .from('group_voice_calls')
          .select('id')
          .eq('group_id', groupId)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
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

  // Update screen share stream from remote or local
  useEffect(() => {
    if (isSharingScreen && localStream && localStream.getVideoTracks().length > 0) {
      setScreenShareStream(localStream);
      return;
    }
    
    // Check if any remote stream has video
    let remoteScreenShare = null;
    remoteStreams.forEach((stream) => {
      if (stream.getVideoTracks().length > 0) {
        remoteScreenShare = stream;
      }
    });
    
    setScreenShareStream(remoteScreenShare);
  }, [remoteStreams, localStream, isSharingScreen]);

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
              <div className={`flex-1 p-4 ${showChat || showParticipants ? 'lg:pr-0' : ''}`}>
                <div className="h-full flex flex-col">
                  {/* Screen share area */}
                  {screenShareStream && (
                    <div className="mb-4">
                      <ScreenShareView stream={screenShareStream} />
                    </div>
                  )}
                  
                  {/* Call participants audio visualization */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Card className="bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-4">
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
                    </Card>
                    
                    {/* Audio visualization for other participants */}
                    {Array.from(remoteStreams).map(([userId, stream]) => (
                      <div key={userId} className="w-full">
                        <Card className="bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-4 h-full">
                          <div className="flex items-center flex-col">
                            <Avatar className="h-16 w-16 mb-2">
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">User</p>
                            <div className="mt-2">
                              {stream.getAudioTracks().some(track => track.enabled) ? (
                                <Mic className="h-5 w-5 text-green-500" />
                              ) : (
                                <MicOff className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar for chat or participants */}
              {showChat && (
                <div className="w-full lg:w-80 h-full">
                  <ChatPanel />
                </div>
              )}

              {showParticipants && !showChat && currentCallId && (
                <div className="w-full lg:w-80 h-full">
                  <ParticipantList callId={currentCallId} />
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <CallControls
                showChat={showChat}
                setShowChat={setShowChat}
                showParticipants={showParticipants}
                setShowParticipants={setShowParticipants}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle>Group Voice Call</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-4">
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
                <div className="flex gap-4">
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
              </CardContent>
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
