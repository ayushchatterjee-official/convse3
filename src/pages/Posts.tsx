
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { CreatePostDialog } from '@/components/posts/CreatePostDialog';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  media_types: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_name: string;
  user_profile_pic?: string;
  user_liked?: boolean;
}

const Posts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch posts directly from the posts table
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, media_urls, media_types, likes_count, comments_count, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData.map(p => p.user_id))];

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_pic')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Get user likes for these posts
      const { data: likesData, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postsData.map(p => p.id));

      if (likesError) {
        console.error('Error fetching likes:', likesError);
      }

      // Create lookup maps
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const likedPostsSet = new Set((likesData || []).map(l => l.post_id));

      // Format posts with joined data
      const formattedPosts = postsData.map((post): Post => {
        const profile = profilesMap.get(post.user_id);
        
        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          media_urls: post.media_urls || [],
          media_types: post.media_types || [],
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          created_at: post.created_at,
          user_name: profile?.name || 'Unknown User',
          user_profile_pic: profile?.profile_pic,
          user_liked: likedPostsSet.has(post.id)
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    fetchPosts();
  };

  const handleLikeToggle = async (postId: string, liked: boolean) => {
    if (!user) return;

    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      }

      // Update local state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              user_liked: liked, 
              likes_count: liked ? post.likes_count + 1 : post.likes_count - 1 
            }
          : post
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading posts...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Posts</h1>
          <CreatePostDialog onPostCreated={handlePostCreated}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </CreatePostDialog>
        </div>

        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No posts yet</p>
              <CreatePostDialog onPostCreated={handlePostCreated}>
                <Button>Create the first post</Button>
              </CreatePostDialog>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Posts;
