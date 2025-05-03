
import React from 'react';
import { Button } from '@/components/ui/button';
import { useVideoCall } from '@/contexts/VideoCallContext';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  ScreenShare,
  MessageCircle,
  Users
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CallControlsProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showParticipants: boolean;
  setShowParticipants: (show: boolean) => void;
}

export const CallControls: React.FC<CallControlsProps> = ({ 
  showChat, 
  setShowChat,
  showParticipants,
  setShowParticipants
}) => {
  const {
    isAudioEnabled,
    isVideoEnabled,
    isSharingScreen,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveCall,
  } = useVideoCall();

  return (
    <div className="flex items-center justify-center p-4 gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "outline" : "destructive"}
              size="icon"
              className="rounded-full"
            >
              {isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "outline" : "destructive"}
              size="icon"
              className="rounded-full"
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleScreenShare}
              variant={isSharingScreen ? "destructive" : "outline"}
              size="icon"
              className="rounded-full"
            >
              <ScreenShare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSharingScreen ? 'Stop sharing screen' : 'Share screen'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowChat(!showChat)}
              variant={showChat ? "secondary" : "outline"}
              size="icon"
              className="rounded-full"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showChat ? 'Hide chat' : 'Show chat'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant={showParticipants ? "secondary" : "outline"}
              size="icon"
              className="rounded-full"
            >
              <Users className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showParticipants ? 'Hide participants' : 'Show participants'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={leaveCall}
              variant="destructive"
              size="icon"
              className="rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Leave call
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
