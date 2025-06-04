
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  allowDownload: boolean;
  fileName?: string;
}

export const MediaModal = ({ 
  isOpen, 
  onClose, 
  mediaUrl, 
  mediaType, 
  allowDownload,
  fileName 
}: MediaModalProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || 'media-file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black">
        <div className="relative flex flex-col h-full">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex gap-2">
              {allowDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
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
