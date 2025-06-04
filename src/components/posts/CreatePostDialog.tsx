
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadFile, getFileType } from '@/lib/fileUpload';
import { Image, Video, X, Type, Heading1, Heading2 } from 'lucide-react';

interface CreatePostDialogProps {
  children: React.ReactNode;
  onPostCreated: () => void;
}

export const CreatePostDialog = ({ children, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [textStyle, setTextStyle] = useState('normal');
  const [textColor, setTextColor] = useState('#000000');
  const [files, setFiles] = useState<File[]>([]);
  const [allowDownload, setAllowDownload] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const type = getFileType(file);
      return type === 'image' || type === 'video';
    });
    
    if (validFiles.length !== selectedFiles.length) {
      toast.error('Only images and videos are allowed');
    }
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatContent = (text: string, style: string, color: string) => {
    if (!text.trim()) return null;
    
    const stylePrefix = style === 'heading1' ? '# ' : style === 'heading2' ? '## ' : '';
    return `<span style="color: ${color}; ${getStyleCss(style)}">${stylePrefix}${text}</span>`;
  };

  const getStyleCss = (style: string) => {
    switch (style) {
      case 'heading1':
        return 'font-size: 24px; font-weight: bold;';
      case 'heading2':
        return 'font-size: 20px; font-weight: bold;';
      default:
        return 'font-size: 14px;';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || (!content.trim() && files.length === 0)) {
      toast.error('Please add some content or media');
      return;
    }

    setUploading(true);

    try {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const url = await uploadFile(file, 'posts', 'post-media');
          if (url) {
            mediaUrls.push(url);
            mediaTypes.push(getFileType(file));
          }
        }
      }

      const formattedContent = formatContent(content, textStyle, textColor);

      // Create post using direct supabase insert
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: formattedContent,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          media_types: mediaTypes.length > 0 ? mediaTypes : null,
          allow_download: allowDownload
        });

      if (error) throw error;

      toast.success('Post created successfully!');
      setContent('');
      setTextStyle('normal');
      setTextColor('#000000');
      setFiles([]);
      setAllowDownload(true);
      setOpen(false);
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Text Style</Label>
            <Select value={textStyle} onValueChange={setTextStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select text style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Normal Text
                  </div>
                </SelectItem>
                <SelectItem value="heading1">
                  <div className="flex items-center gap-2">
                    <Heading1 className="h-4 w-4" />
                    Heading 1
                  </div>
                </SelectItem>
                <SelectItem value="heading2">
                  <div className="flex items-center gap-2">
                    <Heading2 className="h-4 w-4" />
                    Heading 2
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Text Color</Label>
            <Input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full h-10"
            />
          </div>

          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            style={{ 
              color: textColor,
              fontSize: textStyle === 'heading1' ? '24px' : textStyle === 'heading2' ? '20px' : '14px',
              fontWeight: textStyle.includes('heading') ? 'bold' : 'normal'
            }}
          />
          
          <div>
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              <Image className="h-4 w-4" />
              <Video className="h-4 w-4" />
              <span className="text-sm">Add Photos/Videos</span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Selected Files:</p>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="allow-download" className="text-sm">
                    Allow Download
                  </Label>
                  <Switch
                    id="allow-download"
                    checked={allowDownload}
                    onCheckedChange={setAllowDownload}
                  />
                </div>
              </div>
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Creating...' : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
