
import React from 'react';
import { Button } from '@/components/ui/button';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  MessageCircle,
  Smile
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CallControlsProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
}

export const CallControls: React.FC<CallControlsProps> = ({ 
  showChat, 
  setShowChat,
  showEmojiPicker,
  setShowEmojiPicker
}) => {
  const {
    isAudioEnabled,
    toggleAudio,
    leaveCall,
    sendEmoji
  } = useVoiceCall();

  const emojis = ["👋", "👍", "👏", "❤️", "😊", "😂", "😯", "🎉"];

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

        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant={showEmojiPicker ? "secondary" : "outline"}
                  size="icon"
                  className="rounded-full"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Send emoji reaction
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-2 flex-wrap justify-center">
              {emojis.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="text-xl w-10 h-10 p-0"
                  onClick={() => {
                    sendEmoji(emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

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
