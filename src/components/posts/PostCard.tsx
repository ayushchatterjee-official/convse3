import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Download, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/user/UserAvatar';
import { MentionText } from '@/components/shared/MentionText';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CommentsDialog } from './CommentsDialog';
import { MediaModal } from './MediaModal';

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  media_urls: string[] | null;
  media_types: string[] | null;
  allow_download: boolean;
  user_name: string;
  profile_pic: string | null;
  account_status: string;
}

interface PostCardProps {
  post: Post;
  onUpdate?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, onDelete }) => {
  const [likes, setLikes] = useState(post.likes_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const { user } = useAuth();
  const isOwnPost = user?.id === post.user_id;

  const handleLike = async () => {
    try {
      const { error } = await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: user?.id,
      });

      if (error) {
        throw error;
      }

      setLikes(likes + 1);
      onUpdate?.(post.id);
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleUnlike = async () => {
    try {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setLikes(likes - 1);
      onUpdate?.(post.id);
    } catch (error) {
      console.error('Error unliking post:', error);
      toast.error('Failed to unlike post');
    }
  };

  const handleDelete = async () => {
    try {
      if (!isOwnPost) {
        toast.error('You are not authorized to delete this post.');
        return;
      }
  
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
  
      if (error) {
        throw error;
      }
  
      toast.success('Post deleted successfully!');
      onDelete?.(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setMediaModalOpen(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar 
              userId={post.user_id}
              profilePic={post.profile_pic}
              name={post.user_name}
              accountStatus={post.account_status}
              size="md"
            />
            <div>
              <h3 className="font-semibold">{post.user_name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(post.created_at)}
              </p>
            </div>
          </div>
          
          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {post.content && (
          <MentionText text={post.content} className="text-foreground" />
        )}
        
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {post.media_urls.map((url, index) => {
              const mediaType = post.media_types?.[index] || 'image';
              return (
                <div key={index} className="relative">
                  {mediaType.startsWith('image') ? (
                    <img
                      src={url}
                      alt={`Media ${index + 1}`}
                      className="w-full rounded-md cursor-pointer aspect-square object-cover"
                      onClick={() => handleMediaClick(index)}
                    />
                  ) : mediaType.startsWith('video') ? (
                    <video
                      src={url}
                      className="w-full rounded-md cursor-pointer aspect-square object-cover"
                      controls
                      onClick={() => handleMediaClick(index)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 bg-muted rounded-md">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Unsupported Media</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleLike}>
              <Heart className="h-4 w-4 mr-2" />
              {likes} Likes
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCommentsOpen(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {post.comments_count} Comments
            </Button>
          </div>
          {post.allow_download && post.media_urls && post.media_urls.length > 0 && (
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </CardContent>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        postId={post.id}
      />

      <MediaModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        mediaUrls={post.media_urls || []}
        mediaTypes={post.media_types || []}
        startIndex={selectedMediaIndex}
      />
    </Card>
  );
};
