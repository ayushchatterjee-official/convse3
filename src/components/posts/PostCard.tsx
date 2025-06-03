
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageSquare } from 'lucide-react';
import { Post } from '@/pages/Posts';
import { CommentsDialog } from './CommentsDialog';

interface PostCardProps {
  post: Post;
  onLikeToggle: (postId: string, liked: boolean) => void;
}

export const PostCard = ({ post, onLikeToggle }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);

  const handleLikeClick = () => {
    onLikeToggle(post.id, !post.user_liked);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMedia = () => {
    if (!post.media_urls || post.media_urls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {post.media_urls.map((url, index) => {
          const mediaType = post.media_types?.[index] || 'image';
          
          if (mediaType === 'video') {
            return (
              <video
                key={index}
                src={url}
                controls
                className="w-full rounded-lg max-h-96 object-cover"
              />
            );
          } else {
            return (
              <img
                key={index}
                src={url}
                alt="Post media"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            );
          }
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {post.user_profile_pic ? (
              <AvatarImage src={post.user_profile_pic} alt={post.user_name} />
            ) : (
              <AvatarFallback>{post.user_name[0]?.toUpperCase()}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{post.user_name}</p>
            <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {post.content && (
          <p className="text-sm leading-relaxed mb-3">{post.content}</p>
        )}
        
        {renderMedia()}
        
        <div className="flex items-center gap-4 mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeClick}
            className={`gap-2 ${post.user_liked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <Heart className={`h-4 w-4 ${post.user_liked ? 'fill-current' : ''}`} />
            <span className="text-xs">{post.likes_count}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(true)}
            className="gap-2 text-gray-500"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">{post.comments_count}</span>
          </Button>
        </div>
      </CardContent>
      
      <CommentsDialog
        post={post}
        open={showComments}
        onOpenChange={setShowComments}
      />
    </Card>
  );
};
