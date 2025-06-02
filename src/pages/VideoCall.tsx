
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoCall } from '@/contexts/VideoCallContext';
import { VideoPlayer } from '@/components/video-call/VideoPlayer';
import { CallControls } from '@/components/video-call/CallControls';
import { ChatPanel } from '@/components/video-call/ChatPanel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { LoaderCircle } from 'lucide-react';

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
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [inCall, setInCall] = useState(false);

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
    if (roomCode && !inCall && user && localStream) {
      handleJoinWithCode(roomCode);
    }
  }, [roomCode, user, localStream]);

  // Handle creating a new room
  const handleCreateRoom = async () => {
    if (!user) {
      toast.error('You must be logged in to create a room');
      return;
    }

    setLoading(true);
    try {
      const newRoomCode = await createRoom();
      if (newRoomCode) {
        setCurrentRoomCode(newRoomCode);
        if (await joinRoom(newRoomCode)) {
          setInCall(true);
          // Navigate to the room URL to make it shareable
          navigate(`/video-call/${newRoomCode}`);
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
      setCurrentRoomCode(code);
      if (await joinRoom(code)) {
        setInCall(true);
        toast.success('Joined room successfully');
      }
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
    setCurrentRoomCode(null);
    setInCall(false);
    navigate('/dashboard');
  };

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
                Enter the room code provided by the call creator.
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="text-center">
                <p className="mb-4 text-sm text-gray-500">
                  Create a new video call room and share the code with others.
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
          <div className={`flex-1 p-4 ${showChat ? 'lg:pr-0' : ''}`}>
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
                    username="Remote User"
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
            showParticipants={showParticipants}
            setShowParticipants={setShowParticipants}
          />
        </div>

        {/* Room code display for sharing */}
        {currentRoomCode && (
          <div className="bg-gray-50 dark:bg-gray-900 p-2 border-t border-gray-200 dark:border-gray-700 text-center text-sm">
            <span className="text-gray-500">Room Code: </span>
            <span className="font-mono font-bold">{currentRoomCode}</span>
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
      {!inCall && renderJoinScreen()}
      {inCall && renderCallScreen()}
    </DashboardLayout>
  );
};

export default VideoCall;
