
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Play, Pause } from 'lucide-react';
import { Post } from '@/pages/Posts';
import { CommentsDialog } from './CommentsDialog';
import { MediaModal } from './MediaModal';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ClickableUsername } from '@/components/user/ClickableUsername';

interface PostCardProps {
  post: Post;
  onLikeToggle: (postId: string, liked: boolean) => void;
  soundEnabled: boolean;
}

export const PostCard = ({ post, onLikeToggle, soundEnabled }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: string;
    index: number;
  } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<{ [key: number]: boolean }>({});
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleMediaClick = (url: string, type: string, index: number) => {
    setSelectedMedia({ url, type, index });
  };

  const toggleVideoPlay = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRefs.current[index];
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying(prev => ({ ...prev, [index]: true }));
      } else {
        video.pause();
        setIsVideoPlaying(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  // Auto-play videos when in view and handle sound settings
  useEffect(() => {
    if (!post.media_urls) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Auto-play all videos in the post
            post.media_urls?.forEach((_, index) => {
              if (post.media_types?.[index] === 'video') {
                const video = videoRefs.current[index];
                if (video && video.paused) {
                  video.muted = !soundEnabled;
                  video.play().catch(() => {
                    // Handle autoplay restrictions
                  });
                  setIsVideoPlaying(prev => ({ ...prev, [index]: true }));
                }
              }
            });
          } else {
            // Pause all videos when out of view
            post.media_urls?.forEach((_, index) => {
              if (post.media_types?.[index] === 'video') {
                const video = videoRefs.current[index];
                if (video && !video.paused) {
                  video.pause();
                  setIsVideoPlaying(prev => ({ ...prev, [index]: false }));
                }
              }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [post.media_urls, post.media_types, soundEnabled]);

  // Update video sound when soundEnabled changes
  useEffect(() => {
    post.media_urls?.forEach((_, index) => {
      if (post.media_types?.[index] === 'video') {
        const video = videoRefs.current[index];
        if (video) {
          video.muted = !soundEnabled;
        }
      }
    });
  }, [soundEnabled, post.media_urls, post.media_types]);

  const renderContent = () => {
    if (!post.content) return null;
    
    if (post.content.includes('<span')) {
      return (
        <div 
          className="leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      );
    }
    
    return <p className="text-sm leading-relaxed mb-3">{post.content}</p>;
  };

  const renderMedia = () => {
    if (!post.media_urls || post.media_urls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {post.media_urls.map((url, index) => {
          const mediaType = post.media_types?.[index] || 'image';
          
          return (
            <div key={index} className="relative group">
              {mediaType === 'video' ? (
                <div className="relative">
                  <video
                    ref={(el) => { videoRefs.current[index] = el; }}
                    src={url}
                    className="w-full rounded-lg max-h-96 object-cover cursor-pointer"
                    onClick={() => handleMediaClick(url, mediaType, index)}
                    muted={!soundEnabled}
                    loop
                    playsInline
                    onPlay={() => setIsVideoPlaying(prev => ({ ...prev, [index]: true }))}
                    onPause={() => setIsVideoPlaying(prev => ({ ...prev, [index]: false }))}
                  />
                  
                  {/* Play/Pause overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => toggleVideoPlay(index, e)}
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        {isVideoPlaying[index] ? 
                          <Pause className="h-4 w-4" /> : 
                          <Play className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={url}
                    alt="Post media"
                    className="w-full rounded-lg max-h-96 object-cover cursor-pointer"
                    onClick={() => handleMediaClick(url, mediaType, index)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card ref={cardRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              userId={post.user_id}
              profilePic={post.user_profile_pic}
              name={post.user_name}
              size="md"
              showStatus={false}
            />
            <div>
              <ClickableUsername 
                username={post.user_name} 
                className="font-semibold text-sm"
              />
              <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {renderContent()}
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
      </Card>
      
      <CommentsDialog
        post={post}
        open={showComments}
        onOpenChange={setShowComments}
      />

      {selectedMedia && (
        <MediaModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.type}
          fileName={`media-${post.id}-${selectedMedia.index}`}
          soundEnabled={soundEnabled}
        />
      )}
    </>
  );
};
