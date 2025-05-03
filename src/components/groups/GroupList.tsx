import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Users, Lock } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
  is_private: boolean;
  code: string;
  created_at: string;
}

export const GroupList = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    const fetchGroups = async () => {
      try {
        // Get groups where the user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
        
        if (membershipError) throw membershipError;
        
        if (memberships.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }
        
        const groupIds = memberships.map(m => m.group_id);
        
        // Get group details
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds);
        
        if (groupsError) throw groupsError;
        
        setGroups(groupsData || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load your groups');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, [user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-white">
        <Users className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-2 text-lg font-medium">No groups yet</h3>
        <p className="mt-1 text-gray-500">Create your first group to start chatting</p>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Card key={group.id} className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Avatar className="h-16 w-16 border-4 border-white">
              {group.profile_pic ? (
                <AvatarImage src={group.profile_pic} alt={group.name} />
              ) : (
                <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
              )}
            </Avatar>
          </div>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">{group.name}</h3>
              {group.is_private && (
                <Lock className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Group ID: {group.code}
            </p>
          </CardContent>
          <CardFooter className="border-t bg-gray-50 px-6 py-3">
            <Button 
              onClick={() => navigate(`/chat/${group.id}`)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Enter Chat
            </Button>
          </CardFooter>
        </Card>
      ))}
    </>
  );
};

export default GroupList;
