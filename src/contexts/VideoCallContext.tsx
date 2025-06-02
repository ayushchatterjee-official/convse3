
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface VideoCallContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSharingScreen: boolean;
  messages: ChatMessage[];
  initializeLocalStream: () => Promise<boolean>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  sendChatMessage: (content: string) => void;
  leaveCall: () => void;
  joinRoom: (roomId: string) => Promise<boolean>;
  createRoom: () => Promise<string | null>;
  peerConnections: Map<string, PeerConnection>;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerConnections] = useState<Map<string, PeerConnection>>(new Map());
  
  // Function to initialize the local video stream
  const initializeLocalStream = async (): Promise<boolean> => {
    try {
      // Stop any existing tracks first to ensure clean state
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      return true;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera and microphone');
      return false;
    }
  };
  
  // Function to toggle audio
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    
    const newEnabledState = !isAudioEnabled;
    
    localStream.getAudioTracks().forEach(track => {
      track.enabled = newEnabledState;
    });
    
    setIsAudioEnabled(newEnabledState);
    console.log(`Audio ${newEnabledState ? 'enabled' : 'disabled'}`);
  }, [localStream, isAudioEnabled]);
  
  // Function to toggle video
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    
    const newEnabledState = !isVideoEnabled;
    
    localStream.getVideoTracks().forEach(track => {
      track.enabled = newEnabledState;
    });
    
    setIsVideoEnabled(newEnabledState);
    console.log(`Video ${newEnabledState ? 'enabled' : 'disabled'}`);
  }, [localStream, isVideoEnabled]);

  // Function to toggle screen sharing
  const toggleScreenShare = async () => {
    if (!localStream) return;
    
    try {
      if (isSharingScreen) {
        // Stop screen sharing and go back to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: isAudioEnabled,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        
        // Stop all tracks in the current local stream
        localStream.getTracks().forEach(track => track.stop());
        
        setLocalStream(stream);
        setIsSharingScreen(false);
        setIsVideoEnabled(true);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        // Replace only the video track
        const audioTrack = localStream.getAudioTracks()[0];
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        // Stop video tracks in the current local stream
        localStream.getVideoTracks().forEach(track => track.stop());
        
        const newStream = new MediaStream();
        if (audioTrack) newStream.addTrack(audioTrack);
        if (screenVideoTrack) newStream.addTrack(screenVideoTrack);
        
        setLocalStream(newStream);
        setIsSharingScreen(true);
        
        // When screen sharing stops
        screenVideoTrack.addEventListener('ended', async () => {
          await toggleScreenShare();
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to share screen');
    }
  };

  // Function to send a chat message
  const sendChatMessage = (content: string) => {
    if (!content.trim() || !user) return;
    
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: profile?.name || 'User',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    console.log('Chat message sent:', newMessage);
  };

  // Simplified room creation - just generates an ID
  const createRoom = async (): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to create a room');
      return null;
    }
    
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Created room:", roomId);
      toast.success("Room created successfully");
      return roomId;
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
      return null;
    }
  };

  // Simplified room joining
  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user || !localStream) {
      toast.error('You must be logged in and have camera access to join a call');
      return false;
    }
    
    try {
      console.log("Joining room:", roomId);
      toast.success("Room joined successfully");
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
      return false;
    }
  };
  
  // Function to leave the current call
  const leaveCall = async () => {
    try {
      console.log("Leaving call, stopping all connections and streams");
      
      // Clear local state
      setMessages([]);
      
      // Stop local stream tracks before setting to null
      if (localStream) {
        console.log("Stopping all local tracks");
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Track ${track.kind} stopped`);
        });
        setLocalStream(null);
      }
      
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setIsSharingScreen(false);

      toast.info("You have left the call");
    } catch (error) {
      console.error('Error leaving call:', error);
    }
  };

  return (
    <VideoCallContext.Provider
      value={{
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isSharingScreen,
        messages,
        initializeLocalStream,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendChatMessage,
        leaveCall,
        joinRoom,
        createRoom,
        peerConnections,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = (): VideoCallContextType => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};
