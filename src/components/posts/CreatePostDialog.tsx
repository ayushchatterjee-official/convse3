
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
import { Image, Video, X, Type, Heading1, Heading2, Heading3, Bold, Italic } from 'lucide-react';

interface CreatePostDialogProps {
  children: React.ReactNode;
  onPostCreated: () => void;
}

interface TextBlock {
  id: string;
  content: string;
  style: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
}

export const CreatePostDialog = ({ children, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([
    { 
      id: '1', 
      content: '', 
      style: 'normal', 
      color: '#000000', 
      fontSize: '14px',
      fontWeight: 'normal',
      fontStyle: 'normal'
    }
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [allowDownload, setAllowDownload] = useState(true);
  const [uploading, setUploading] = useState(false);

  const addTextBlock = () => {
    const newBlock: TextBlock = {
      id: Date.now().toString(),
      content: '',
      style: 'normal',
      color: '#000000',
      fontSize: '14px',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
    setTextBlocks([...textBlocks, newBlock]);
  };

  const updateTextBlock = (id: string, field: keyof TextBlock, value: string) => {
    setTextBlocks(textBlocks.map(block => 
      block.id === id ? { ...block, [field]: value } : block
    ));
  };

  const removeTextBlock = (id: string) => {
    if (textBlocks.length > 1) {
      setTextBlocks(textBlocks.filter(block => block.id !== id));
    }
  };

  const getStyleFromSelection = (style: string) => {
    switch (style) {
      case 'heading1':
        return { fontSize: '32px', fontWeight: 'bold' };
      case 'heading2':
        return { fontSize: '24px', fontWeight: 'bold' };
      case 'heading3':
        return { fontSize: '20px', fontWeight: 'bold' };
      case 'large':
        return { fontSize: '18px', fontWeight: 'normal' };
      case 'small':
        return { fontSize: '12px', fontWeight: 'normal' };
      default:
        return { fontSize: '14px', fontWeight: 'normal' };
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const type = getFileType(file);
      return type === 'image' || type === 'video';
    });
    
    if (validFiles.length !== selectedFiles.length) {
      toast.error('Only images and videos are allowed');
    }
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatContent = () => {
    const validBlocks = textBlocks.filter(block => block.content.trim());
    if (validBlocks.length === 0) return null;

    return validBlocks.map(block => {
      const style = getStyleFromSelection(block.style);
      return `<span style="color: ${block.color}; font-size: ${style.fontSize}; font-weight: ${block.fontWeight}; font-style: ${block.fontStyle}; display: block; margin-bottom: 8px;">${block.content}</span>`;
    }).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasContent = textBlocks.some(block => block.content.trim());
    if (!user || (!hasContent && files.length === 0)) {
      toast.error('Please add some content or media');
      return;
    }

    setUploading(true);

    try {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];

      if (files.length > 0) {
        for (const file of files) {
          const url = await uploadFile(file, 'posts', 'post-media');
          if (url) {
            mediaUrls.push(url);
            mediaTypes.push(getFileType(file));
          }
        }
      }

      const formattedContent = formatContent();

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
      setTextBlocks([{ 
        id: '1', 
        content: '', 
        style: 'normal', 
        color: '#000000', 
        fontSize: '14px',
        fontWeight: 'normal',
        fontStyle: 'normal'
      }]);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text blocks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Content</Label>
              <Button type="button" onClick={addTextBlock} variant="outline" size="sm">
                Add Text Block
              </Button>
            </div>
            
            {textBlocks.map((block, index) => (
              <div key={block.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Text Block {index + 1}</Label>
                  {textBlocks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTextBlock(block.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Style Selection */}
                  <div>
                    <Label className="text-xs">Style</Label>
                    <Select 
                      value={block.style} 
                      onValueChange={(value) => updateTextBlock(block.id, 'style', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <Type className="h-3 w-3" />
                            Normal
                          </div>
                        </SelectItem>
                        <SelectItem value="heading1">
                          <div className="flex items-center gap-2">
                            <Heading1 className="h-3 w-3" />
                            Heading 1
                          </div>
                        </SelectItem>
                        <SelectItem value="heading2">
                          <div className="flex items-center gap-2">
                            <Heading2 className="h-3 w-3" />
                            Heading 2
                          </div>
                        </SelectItem>
                        <SelectItem value="heading3">
                          <div className="flex items-center gap-2">
                            <Heading3 className="h-3 w-3" />
                            Heading 3
                          </div>
                        </SelectItem>
                        <SelectItem value="large">Large Text</SelectItem>
                        <SelectItem value="small">Small Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={block.color}
                      onChange={(e) => updateTextBlock(block.id, 'color', e.target.value)}
                      className="h-8 w-full"
                    />
                  </div>

                  {/* Font Weight */}
                  <div>
                    <Label className="text-xs">Weight</Label>
                    <Select 
                      value={block.fontWeight} 
                      onValueChange={(value) => updateTextBlock(block.id, 'fontWeight', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="lighter">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Style */}
                  <div>
                    <Label className="text-xs">Style</Label>
                    <Select 
                      value={block.fontStyle} 
                      onValueChange={(value) => updateTextBlock(block.id, 'fontStyle', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Text Input */}
                <Textarea
                  placeholder="Enter your text..."
                  value={block.content}
                  onChange={(e) => updateTextBlock(block.id, 'content', e.target.value)}
                  className="min-h-[80px] resize-none"
                  style={{ 
                    color: block.color,
                    fontSize: getStyleFromSelection(block.style).fontSize,
                    fontWeight: block.fontWeight,
                    fontStyle: block.fontStyle
                  }}
                />
              </div>
            ))}
          </div>

          {/* File Upload */}
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
