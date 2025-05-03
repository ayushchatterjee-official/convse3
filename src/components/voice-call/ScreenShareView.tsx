
import React, { useRef, useEffect } from 'react';

interface ScreenShareViewProps {
  stream: MediaStream | null;
}

export const ScreenShareView: React.FC<ScreenShareViewProps> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update stream when it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream || stream.getVideoTracks().length === 0) {
    return null;
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800 aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-3 left-3 bg-black/50 rounded-md px-2 py-1 text-white text-sm">
        Screen Share
      </div>
    </div>
  );
};
