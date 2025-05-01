
import React, { useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  isLocal?: boolean;
  username?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  muted = false,
  isLocal = false,
  username = 'User',
  isAudioEnabled = true,
  isVideoEnabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800">
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover rounded-lg ${isLocal ? 'mirror' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
          <Avatar className="h-24 w-24">
            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-4xl">
              {username.charAt(0).toUpperCase()}
            </div>
          </Avatar>
        </div>
      )}
      
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/50 rounded-md px-2 py-1 text-white text-sm">
          {username} {isLocal && '(You)'}
        </div>
        
        <div className="flex items-center gap-1">
          {!isAudioEnabled && (
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          
          {!isVideoEnabled && (
            <div className="bg-red-500 rounded-full p-1">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
