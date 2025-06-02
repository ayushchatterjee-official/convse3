
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const currentRoomId = useRef<string | null>(null);
  
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
  
  // Function to toggle audio - improved with reliable state updates
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    
    const newEnabledState = !isAudioEnabled;
    
    localStream.getAudioTracks().forEach(track => {
      track.enabled = newEnabledState;
    });
    
    setIsAudioEnabled(newEnabledState);
    console.log(`Audio ${newEnabledState ? 'enabled' : 'disabled'}`);
  }, [localStream, isAudioEnabled]);
  
  // Function to toggle video - improved with reliable state updates
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
        
        // Update all peer connections with new stream
        peerConnections.current.forEach((peer) => {
          const senders = peer.connection.getSenders();
          senders.forEach((sender) => {
            if (sender.track?.kind === 'video') {
              const track = stream.getVideoTracks()[0];
              if (track) {
                sender.replaceTrack(track);
              }
            }
          });
        });
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
        
        // Update all peer connections with new stream
        peerConnections.current.forEach((peer) => {
          const senders = peer.connection.getSenders();
          senders.forEach((sender) => {
            if (sender.track?.kind === 'video') {
              sender.replaceTrack(screenVideoTrack);
            }
          });
        });
        
        // When screen sharing stops
        screenVideoTrack.addEventListener('ended', async () => {
          // Go back to camera
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
    if (!content.trim() || !user || !currentRoomId.current) return;
    
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: profile?.name || 'User',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Send message to other participants via Supabase Realtime
    // This could be enhanced with direct WebRTC data channels for better performance
    supabase
      .channel(`room:${currentRoomId.current}`)
      .send({
        type: 'broadcast',
        event: 'chat',
        payload: newMessage
      });
  };

  // Function to create a new room - simplified version
  const createRoom = async (): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to create a room');
      return null;
    }
    
    try {
      // Generate a simple room ID for now
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

  // Function to join a room - simplified version
  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user || !localStream) {
      toast.error('You must be logged in and have camera access to join a call');
      return false;
    }
    
    try {
      currentRoomId.current = roomId;
      
      console.log("Joining room:", roomId);
      toast.success("Room joined successfully");
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
      return false;
    }
  };
  
  // Function to leave the current call - improved to ensure all tracks are properly stopped
  const leaveCall = async () => {
    if (!currentRoomId.current || !user) return;
    
    try {
      console.log("Leaving call, stopping all connections and streams");
      
      // Close all peer connections
      peerConnections.current.forEach((peer) => {
        peer.connection.close();
      });
      
      peerConnections.current.clear();
      setRemoteStreams(new Map());
      
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
      
      currentRoomId.current = null;
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setIsSharingScreen(false);

      toast.info("You have left the call");
    } catch (error) {
      console.error('Error leaving call:', error);
    }
  };

  // Helper function to create a peer connection
  const createPeerConnection = async (peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> => {
    if (!localStream || !user) {
      throw new Error('Local stream or user not available');
    }
    
    const iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };
    
    // Create new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add local stream tracks to the connection
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    // Set up event handlers
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentRoomId.current) {
        // This would send ICE candidate to the peer via Supabase Realtime
        console.log("ICE candidate generated", event.candidate);
      }
    };
    
    peerConnection.ontrack = (event) => {
      // Add remote stream
      const stream = event.streams[0];
      console.log("Remote track received", stream);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(peerId, stream);
        return newStreams;
      });
    };
    
    // Store the connection
    peerConnections.current.set(peerId, {
      userId: peerId,
      connection: peerConnection,
      stream: localStream
    });
    
    return peerConnection;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("VideoCallProvider unmounting, cleaning up resources");
      
      // Close all peer connections
      peerConnections.current.forEach((peer) => {
        peer.connection.close();
      });
      
      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

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
        peerConnections: peerConnections.current,
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
