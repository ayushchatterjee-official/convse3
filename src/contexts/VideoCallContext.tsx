
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { VideoCallRoom } from '@/models/VideoCallRoom';

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
  createRoom: () => Promise<VideoCallRoom | null>;
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
  const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTracks = localStream.getAudioTracks();
    const enabled = !isAudioEnabled;
    
    audioTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    setIsAudioEnabled(enabled);
  };
  
  // Function to toggle video
  const toggleVideo = () => {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    const enabled = !isVideoEnabled;
    
    videoTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    setIsVideoEnabled(enabled);
    
    // Update UI state immediately
    peerConnections.current.forEach((peer) => {
      if (peer.stream) {
        const senders = peer.connection.getSenders();
        senders.forEach((sender) => {
          if (sender.track?.kind === 'video') {
            sender.track.enabled = enabled;
          }
        });
      }
    });
  };

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

  // Function to create a new room
  const createRoom = async (): Promise<VideoCallRoom | null> => {
    if (!user) {
      toast.error('You must be logged in to create a room');
      return null;
    }
    
    try {
      // Generate a 6-digit room code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Insert the room into the video_call_rooms table
      const { data: roomData, error } = await supabase
        .from('video_call_rooms')
        .insert({
          code: code,
          admin_id: user.id, 
          last_activity: new Date().toISOString(),
          active: true
        })
        .select('*')
        .single();
        
      if (error) {
        console.error("Room creation error:", error);
        throw error;
      }
      
      // Add the creator as a participant
      await supabase
        .from('video_call_participants')
        .insert({
          user_id: user.id,
          room_id: roomData.id,
          is_admin: true,
          approved: true
        });
      
      return roomData as VideoCallRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
      return null;
    }
  };

  // Function to join a room
  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user || !localStream) {
      toast.error('You must be logged in and have camera access to join a call');
      return false;
    }
    
    try {
      currentRoomId.current = roomId;
      
      // Update room's last activity
      await supabase
        .from('video_call_rooms')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', roomId);
      
      // Check if user is already a participant
      const { data: participantData } = await supabase
        .from('video_call_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      
      if (!participantData) {
        // If not already a participant, add as participant (based on approval)
        await supabase
          .from('video_call_participants')
          .insert({
            user_id: user.id,
            room_id: roomId,
            approved: false // This will be updated when approved by admin
          });
      }
      
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
    if (!currentRoomId.current || !user) return;
    
    try {
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
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      setLocalStream(null);
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
