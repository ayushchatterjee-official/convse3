
import React, { useState, useEffect } from 'react';
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
import { LoaderCircle, PhoneCall, Mic, MicOff } from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  profile_pic: string | null;
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
    leaveCall,
  } = useVoiceCall();

  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);

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

  // Handle starting a new call
  const handleStartCall = async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      await initializeLocalStream();
      setCallInProgress(true);
      toast.success('Call started successfully');
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
      setCallInProgress(true);
      toast.success('Joined call successfully');
    } catch (error) {
      console.error('Failed to join call:', error);
      toast.error('Failed to join call');
    } finally {
      setLoading(false);
    }
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
                    </Card>
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
    </DashboardLayout>
  );
};

export default GroupVoiceCall;
