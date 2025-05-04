import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface VoiceCallContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isSharingScreen: boolean;
  messages: ChatMessage[];
  initializeLocalStream: () => Promise<boolean>;
  toggleAudio: () => void;
  toggleScreenShare: () => void;
  sendChatMessage: (content: string) => void;
  sendEmoji: (emoji: string) => void;
  leaveCall: () => void;
  joinGroupCall: (groupId: string) => Promise<boolean>;
  startGroupCall: (groupId: string) => Promise<string | null>;
  acceptCall: (callId: string) => Promise<boolean>;
  declineCall: (callId: string) => Promise<boolean>;
  currentCallId: string | null;
  currentGroupId: string | null;
  peerConnections: Map<string, PeerConnection>;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

const VoiceCallContext = createContext<VoiceCallContextType | null>(null);

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  
  // Function to initialize the local audio stream (voice only)
  const initializeLocalStream = async (): Promise<boolean> => {
    try {
      // Stop any existing tracks first to ensure clean state
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Get only audio stream, no video
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      setLocalStream(stream);
      setIsAudioEnabled(true);
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Failed to access microphone');
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

  // Function to toggle screen sharing
  const toggleScreenShare = async () => {
    if (!localStream) return;
    
    try {
      if (isSharingScreen) {
        // Stop screen sharing and go back to audio only
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: isAudioEnabled,
          video: false
        });
        
        // Stop all tracks in the current local stream
        localStream.getTracks().forEach(track => track.stop());
        
        setLocalStream(audioStream);
        setIsSharingScreen(false);
        
        // Update all peer connections with new stream
        peerConnections.current.forEach((peer) => {
          const senders = peer.connection.getSenders();
          senders.forEach((sender) => {
            if (sender.track?.kind === 'audio') {
              const track = audioStream.getAudioTracks()[0];
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
          audio: false
        });
        
        // Keep the audio track from existing stream
        const audioTrack = localStream.getAudioTracks()[0];
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        const newStream = new MediaStream();
        if (audioTrack) newStream.addTrack(audioTrack);
        if (screenVideoTrack) newStream.addTrack(screenVideoTrack);
        
        setLocalStream(newStream);
        setIsSharingScreen(true);
        
        // Update all peer connections with new stream
        peerConnections.current.forEach((peer) => {
          const senders = peer.connection.getSenders();
          
          // Find if there's already a video sender
          const videoSender = senders.find(sender => sender.track?.kind === 'video');
          
          if (videoSender) {
            videoSender.replaceTrack(screenVideoTrack);
          } else {
            // If no video sender exists, add the track
            peer.connection.addTrack(screenVideoTrack, newStream);
          }
        });
        
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
    if (!content.trim() || !user || !currentCallId) return;
    
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: profile?.name || 'User',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Send message to other participants via Supabase Realtime
    const channel = supabase.channel(`call:${currentCallId}`);
    channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: newMessage
    });
  };

  // Function to send emoji reaction
  const sendEmoji = (emoji: string) => {
    if (!user || !currentCallId) return;
    
    // Send emoji notification via Supabase Realtime
    const channel = supabase.channel(`call:${currentCallId}`);
    
    // Send event
    channel.send({
      type: 'broadcast',
      event: 'emoji',
      payload: {
        userId: user.id,
        userName: profile?.name || 'User',
        emoji: emoji,
        timestamp: new Date()
      }
    });
      
    // Show a toast for the sent emoji
    toast(`You sent ${emoji}`);
  };

  // Function to start a group call
  const startGroupCall = async (groupId: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to start a call');
      return null;
    }
    
    try {
      // Insert a new call record using the database function
      const { data, error } = await supabase
        .rpc('create_group_call', {
          p_group_id: groupId,
          p_user_id: user.id
        });
      
      if (error) {
        console.error("Call creation error:", error);
        throw error;
      }
      
      const callId = data as string;
      setCurrentCallId(callId);
      setCurrentGroupId(groupId);
      
      // Get group members to notify them about the call
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .neq('user_id', user.id); // Exclude caller
      
      if (groupMembers && groupMembers.length > 0) {
        // Notify group members about the call via Supabase Realtime
        const channel = supabase.channel(`group:${groupId}`);
        
        // Send the notification
        await channel.send({
          type: 'broadcast',
          event: 'call_started',
          payload: {
            callId: callId,
            groupId: groupId,
            callerId: user.id,
            callerName: profile?.name || 'User'
          }
        });
        
        // Subscribe to the channel
        channel.subscribe();
      }
      
      return callId;
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      return null;
    }
  };
  
  // Function to join a group call
  const joinGroupCall = async (groupId: string): Promise<boolean> => {
    if (!user || !localStream) {
      toast.error('You must be logged in and have microphone access');
      return false;
    }
    
    try {
      // Find active call for this group using database function
      const { data: callData, error } = await supabase
        .rpc('get_active_group_call', {
          p_group_id: groupId
        });
      
      if (error || !callData) {
        console.error('No active call found for this group', error);
        toast.error('No active call found for this group');
        return false;
      }
      
      const callId = callData as string;
      
      setCurrentCallId(callId);
      setCurrentGroupId(groupId);
      
      // Insert participant into call_participants table
      await supabase
        .rpc('join_voice_call', {
          p_call_id: callId,
          p_user_id: user.id
        });
      
      // Notify other participants about joining
      const channel = supabase.channel(`call:${callId}`);
      
      // Send event
      await channel.send({
        type: 'broadcast',
        event: 'user_joined',
        payload: {
          userId: user.id,
          userName: profile?.name || 'User',
          timestamp: new Date()
        }
      });
      
      // Subscribe to the channel
      channel.subscribe();
      
      // Subscribe to call channel for messages and events
      channel
        .on('broadcast', { event: 'chat' }, (payload) => {
          if (payload.payload.senderId !== user.id) {
            setMessages(prev => [...prev, payload.payload]);
          }
        })
        .on('broadcast', { event: 'emoji' }, (payload) => {
          if (payload.payload.userId !== user.id) {
            toast(`${payload.payload.userName} sent ${payload.payload.emoji}`);
          }
        })
        .on('broadcast', { event: 'user_joined' }, (payload) => {
          if (payload.payload.userId !== user.id) {
            toast.info(`${payload.payload.userName} joined the call`);
          }
        })
        .on('broadcast', { event: 'user_left' }, (payload) => {
          if (payload.payload.userId !== user.id) {
            toast.info(`${payload.payload.userName} left the call`);
          }
        });
      
      console.log("Joined call:", callId);
      toast.success("Call joined successfully");
      return true;
    } catch (error) {
      console.error('Error joining call:', error);
      toast.error('Failed to join call');
      return false;
    }
  };
  
  // Function to accept an incoming call
  const acceptCall = async (callId: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to accept a call');
      return false;
    }
    
    try {
      // Get call details to find group ID
      const { data: callData, error } = await supabase
        .rpc('get_call_group_id', {
          p_call_id: callId
        });
        
      if (error || !callData) {
        toast.error('Call not found or has ended');
        return false;
      }
      
      const groupId = callData as string;
      
      // Initialize audio stream
      const streamInitialized = await initializeLocalStream();
      if (!streamInitialized) {
        return false;
      }
      
      // Set current call and group IDs
      setCurrentCallId(callId);
      setCurrentGroupId(groupId);
      
      // Insert participant into call_participants table
      await supabase
        .rpc('join_voice_call', {
          p_call_id: callId,
          p_user_id: user.id
        });
      
      // Notify other participants about joining
      const channel = supabase.channel(`call:${callId}`);
      
      // Send event
      await channel.send({
        type: 'broadcast',
        event: 'user_joined',
        payload: {
          userId: user.id,
          userName: profile?.name || 'User',
          timestamp: new Date()
        }
      });
      
      // Subscribe to the channel
      channel.subscribe();
      
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
      return false;
    }
  };
  
  // Function to decline an incoming call
  const declineCall = async (callId: string): Promise<boolean> => {
    try {
      // Nothing needs to be done in the database for declining
      // Just notify the caller that we declined
      if (user) {
        const channel = supabase.channel(`call:${callId}`);
        
        // Send event
        await channel.send({
          type: 'broadcast',
          event: 'call_declined',
          payload: {
            userId: user.id,
            userName: profile?.name || 'User'
          }
        });
        
        // Subscribe to the channel
        channel.subscribe();
      }
      
      toast.info('Call declined');
      return true;
    } catch (error) {
      console.error('Error declining call:', error);
      return false;
    }
  };
  
  // Function to leave the current call
  const leaveCall = async () => {
    if (!currentCallId || !user) return;
    
    try {
      console.log("Leaving call, stopping all connections and streams");
      
      // Send leave notification
      const channel = supabase.channel(`call:${currentCallId}`);
      
      // Send the event
      await channel.send({
        type: 'broadcast',
        event: 'user_left',
        payload: {
          userId: user.id,
          userName: profile?.name || 'User',
          timestamp: new Date()
        }
      });
      
      // Subscribe to the channel
      channel.subscribe();
      
      // Update participation record
      await supabase
        .rpc('leave_voice_call', {
          p_call_id: currentCallId,
          p_user_id: user.id
        });
      
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
      
      setCurrentCallId(null);
      setCurrentGroupId(null);
      setIsAudioEnabled(false);
      setIsSharingScreen(false);

      toast.info("You have left the call");
    } catch (error) {
      console.error('Error leaving call:', error);
    }
  };

  // Helper function to create a peer connection
  const createPeerConnection = async (peerId: string): Promise<RTCPeerConnection> => {
    if (!localStream || !user) {
      throw new Error('Local stream or user not available');
    }
    
    const iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.google.com:19302' },
        { urls: 'stun:stun2.google.com:19302' },
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
      if (event.candidate && currentCallId) {
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
      console.log("VoiceCallProvider unmounting, cleaning up resources");
      
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
      
      // Leave any active call
      if (currentCallId) {
        leaveCall();
      }
    };
  }, []);

  return (
    <VoiceCallContext.Provider
      value={{
        localStream,
        remoteStreams,
        isAudioEnabled,
        isSharingScreen,
        messages,
        initializeLocalStream,
        toggleAudio,
        toggleScreenShare,
        sendChatMessage,
        sendEmoji,
        leaveCall,
        joinGroupCall,
        startGroupCall,
        acceptCall,
        declineCall,
        currentCallId,
        currentGroupId,
        peerConnections: peerConnections.current,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = (): VoiceCallContextType => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within a VoiceCallProvider');
  }
  return context;
};
