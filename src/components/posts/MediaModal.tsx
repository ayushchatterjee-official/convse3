
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {allowDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="absolute top-2 right-12 z-10 bg-black/50 text-white hover:bg-black/70"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center justify-center min-h-[300px] bg-black">
            {mediaType === 'video' ? (
              <video
                src={mediaUrl}
                controls
                className="max-w-full max-h-[80vh] object-contain"
                autoPlay
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Media content"
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
