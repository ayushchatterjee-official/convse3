import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoCall } from '@/contexts/VideoCallContext';
import { VideoPlayer } from '@/components/video-call/VideoPlayer';
import { CallControls } from '@/components/video-call/CallControls';
import { ChatPanel } from '@/components/video-call/ChatPanel';
import { ParticipantList } from '@/components/video-call/ParticipantList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { LoaderCircle } from 'lucide-react';
import { VideoCallParticipant, VideoCallRoom } from '@/models/VideoCallRoom';

const VideoCall: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    initializeLocalStream,
    joinRoom,
    createRoom,
    leaveCall,
  } = useVideoCall();

  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState<VideoCallRoom | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [participants, setParticipants] = useState<VideoCallParticipant[]>([]);

  // Check if the user is the room admin
  useEffect(() => {
    if (roomData && user) {
      setIsAdmin(roomData.admin_id === user.id);
    }
  }, [roomData, user]);

  // Initialize local stream when component mounts
  useEffect(() => {
    const init = async () => {
      await initializeLocalStream();
    };

    if (!localStream) {
      init();
    }

    // Cleanup on leave
    return () => {
      leaveCall();
    };
  }, []);

  // Handle room code from URL
  useEffect(() => {
    if (roomCode && !roomData && user && localStream) {
      handleJoinWithCode(roomCode);
    }
  }, [roomCode, user, localStream]);

  // Fetch participants for the current room
  useEffect(() => {
    if (!roomData) return;

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .rpc('get_room_participants', { room_id_param: roomData.id });
      
      if (!error && data) {
        setParticipants(data as VideoCallParticipant[]);
      }
    };
    
    fetchParticipants();
    
    // Poll for changes
    const intervalId = setInterval(fetchParticipants, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [roomData]);

  // Handle creating a new room
  const handleCreateRoom = async () => {
    if (!user) {
      toast.error('You must be logged in to create a room');
      return;
    }

    setLoading(true);
    try {
      const newRoomData = await createRoom();
      if (newRoomData) {
        setRoomData(newRoomData as VideoCallRoom);
        if (await joinRoom(newRoomData.id)) {
          // Navigate to the room URL to make it shareable
          navigate(`/video-call/${newRoomData.code}`);
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining a room with a code
  const handleJoinWithCode = async (code: string) => {
    if (!user) {
      toast.error('You must be logged in to join a room');
      return;
    }

    if (!code.trim()) {
      toast.error('Please enter a valid room code');
      return;
    }

    setLoading(true);
    try {
      // Find the room with this code
      const { data: roomData, error: roomError } = await supabase
        .from('video_call_rooms')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .single();

      if (roomError || !roomData) {
        toast.error('Room not found or inactive');
        return;
      }

      // Check if the user is already a participant
      const { data: participantData } = await supabase
        .from('video_call_participants')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id)
        .single();

      if (participantData && participantData.approved) {
        // User is already an approved participant
        setRoomData(roomData as VideoCallRoom);
        await joinRoom(roomData.id);
      } else if (roomData.admin_id === user.id) {
        // User is the admin of the room
        setRoomData(roomData as VideoCallRoom);
        await joinRoom(roomData.id);
      } else {
        // User needs approval to join
        // Create join request
        const { error: requestError } = await supabase
          .from('video_call_join_requests')
          .upsert({
            user_id: user.id,
            room_id: roomData.id,
            status: 'pending',
            created_at: new Date().toISOString()
          });

        if (requestError) {
          throw requestError;
        }

        setRoomData(roomData as VideoCallRoom);
        setRequestSent(true);
        toast.info('Join request sent. Waiting for approval.');
      }

      // Update room's last activity
      await supabase
        .from('video_call_rooms')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', roomData.id);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  // Handle user leaving the call
  const handleLeaveCall = () => {
    leaveCall();
    setRoomData(null);
    setRequestSent(false);
    navigate('/dashboard');
  };

  // Check if user's join request is approved
  useEffect(() => {
    if (!user || !roomData || !requestSent) return;

    const checkApproval = async () => {
      const { data } = await supabase
        .from('video_call_participants')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id)
        .eq('approved', true)
        .single();

      if (data) {
        setRequestSent(false);
        await joinRoom(roomData.id);
        toast.success('Your join request was approved');
      }
    };

    // Check initially
    checkApproval();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`room:${roomData.id}:participants`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'video_call_participants' },
        (payload) => {
          if (payload.new && payload.new.user_id === user.id) {
            checkApproval();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomData, requestSent]);

  // Main content when not in a call
  const renderJoinScreen = () => {
    return (
      <div className="container max-w-md mx-auto py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Video Call</h1>

          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="join">Join a Call</TabsTrigger>
              <TabsTrigger value="create">Create a Call</TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="room-code" className="text-sm font-medium">
                  Enter Room Code
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="room-code"
                    value={joinInputCode}
                    onChange={(e) => setJoinInputCode(e.target.value)}
                    placeholder="e.g., 123456"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleJoinWithCode(joinInputCode)}
                    disabled={loading}
                  >
                    {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Join
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Enter the 6-digit code provided by the call creator.
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="text-center">
                <p className="mb-4 text-sm text-gray-500">
                  Create a new video call room. You'll be the admin and can approve who joins.
                </p>
                <Button 
                  onClick={handleCreateRoom} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Create Room
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  };

  // Render waiting for approval screen
  const renderWaitingScreen = () => {
    return (
      <div className="container max-w-md mx-auto py-8">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Waiting for Approval</h1>
          <p className="mb-6 text-gray-500">
            Your request to join this call is pending approval from the room admin.
          </p>
          <div className="animate-pulse flex justify-center mb-6">
            <div className="h-10 w-10 bg-blue-400 rounded-full"></div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLeaveCall}
          >
            Cancel Request
          </Button>
        </Card>
      </div>
    );
  };

  // Main content when in a call
  const renderCallScreen = () => {
    // Convert Map to Array for rendering
    const remoteStreamArray = Array.from(remoteStreams).map(([userId, stream]) => ({
      userId,
      stream
    }));

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex">
          <div className={`flex-1 p-4 ${showChat || showParticipants ? 'lg:pr-0' : ''}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Local user video */}
              <div className="w-full h-full">
                <VideoPlayer
                  stream={localStream}
                  muted={true}
                  isLocal={true}
                  username={profile?.name || 'You'}
                  isAudioEnabled={isAudioEnabled}
                  isVideoEnabled={isVideoEnabled}
                />
              </div>

              {/* Remote participant videos */}
              {remoteStreamArray.map(({ userId, stream }) => (
                <div key={userId} className="w-full h-full">
                  <VideoPlayer
                    stream={stream}
                    username={
                      participants.find(p => p.user_id === userId)?.user_name || 'User'
                    }
                  />
                </div>
              ))}

              {/* Fill empty spaces with placeholders for visual balance */}
              {remoteStreamArray.length === 0 && (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">
                    Waiting for others to join...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar for chat or participants */}
          {showChat && (
            <div className="w-full lg:w-80 h-full">
              <ChatPanel />
            </div>
          )}

          {showParticipants && !showChat && roomData && (
            <div className="w-full lg:w-80 h-full">
              <ParticipantList
                roomId={roomData.id}
                isAdmin={isAdmin}
              />
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
          />
        </div>

        {/* Room code display for sharing */}
        {roomData && (
          <div className="bg-gray-50 dark:bg-gray-900 p-2 border-t border-gray-200 dark:border-gray-700 text-center text-sm">
            <span className="text-gray-500">Room Code: </span>
            <span className="font-mono font-bold">{roomData.code}</span>
            <span className="text-gray-500 ml-2">
              (Share this code with others to invite them)
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      {requestSent && renderWaitingScreen()}
      {!requestSent && !roomData && renderJoinScreen()}
      {!requestSent && roomData && renderCallScreen()}
    </DashboardLayout>
  );
};

export default VideoCall;
