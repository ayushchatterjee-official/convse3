
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  fileName?: string;
  soundEnabled: boolean;
}

export const MediaModal = ({ 
  isOpen, 
  onClose, 
  mediaUrl, 
  mediaType, 
  fileName,
  soundEnabled 
}: MediaModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black">
        <div className="relative flex flex-col h-full">
          {/* Header with close button */}
          <div className="absolute top-0 right-0 z-20 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Media content */}
          <div className="flex items-center justify-center min-h-[70vh] p-4">
            {mediaType === 'video' ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                muted={!soundEnabled}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Media content"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
