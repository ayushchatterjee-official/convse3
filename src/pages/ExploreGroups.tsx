
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
  is_private: boolean;
  code: string;
}

const ExploreGroups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupCode, setGroupCode] = useState('');
  
  const [joinDialog, setJoinDialog] = useState<{open: boolean, group: Group | null, isInvited: boolean}>({
    open: false,
    group: null,
    isInvited: false
  });
  const [password, setPassword] = useState('');
  const [joining, setJoining] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchGroups();
  }, [user, navigate]);
  
  useEffect(() => {
    if (searchQuery) {
      const filtered = groups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(groups);
    }
  }, [searchQuery, groups]);
  
  const fetchGroups = async () => {
    setLoading(true);
    try {
      // First, get the IDs of groups the user is already a member of
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id || '');
      
      if (membershipError) throw membershipError;
      
      const userGroupIds = (memberships || []).map(m => m.group_id);
      
      // Then get only public groups, filtering out the ones the user is already in
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('is_private', false); // Only fetch public groups
      
      if (error) throw error;
      
      // Filter out groups the user is already a member of
      const availableGroups = data.filter(group => !userGroupIds.includes(group.id));
      setGroups(availableGroups);
      setFilteredGroups(availableGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinByCode = async () => {
    if (!groupCode.trim()) {
      toast.error('Please enter a group code');
      return;
    }
    
    setJoining(true);
    try {
      // Find the group by code
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('code', groupCode.trim())
        .single();
      
      if (groupError) {
        toast.error('Invalid group code');
        return;
      }

      // Check if user has an invitation for this group
      const { data: inviteData } = await supabase
        .from('group_invitations' as any)
        .select('*')
        .eq('group_id', groupData.id)
        .eq('invitee_id', user?.id)
        .eq('status', 'pending')
        .single();
      
      // If the group is private and user doesn't have an invitation, show error
      if (groupData.is_private && !inviteData) {
        toast.error('This is a private group. You need an invitation to join.');
        setJoining(false);
        return;
      }
      
      // For private group with invitation or public group, prompt for confirmation
      setJoinDialog({
        open: true,
        group: groupData,
        isInvited: !!inviteData
      });
    } catch (error) {
      console.error('Error joining group by code:', error);
      toast.error('Failed to join group');
    } finally {
      setJoining(false);
    }
  };
  
  const handleOpenJoinDialog = async (group: Group) => {
    try {
      // Check if user has an invitation for this group
      const { data: inviteData } = await supabase
        .from('group_invitations' as any)
        .select('*')
        .eq('group_id', group.id)
        .eq('invitee_id', user?.id)
        .eq('status', 'pending')
        .single();

      setJoinDialog({
        open: true,
        group,
        isInvited: !!inviteData
      });
      setPassword('');
    } catch (error) {
      // If no invitation found, proceed normally
      setJoinDialog({
        open: true,
        group,
        isInvited: false
      });
      setPassword('');
    }
  };
  
  const handleJoinWithPassword = async () => {
    if (!joinDialog.group) return;
    
    setJoining(true);
    try {
      // For private group, check password unless user has an invitation
      if (joinDialog.group.is_private && !joinDialog.isInvited) {
        const { data, error } = await supabase
          .from('groups')
          .select('id')
          .eq('id', joinDialog.group.id)
          .eq('password', password)
          .single();
        
        if (error || !data) {
          toast.error('Incorrect password');
          setJoining(false);
          return;
        }
      }
      
      await joinGroup(joinDialog.group.id);
      
      // If joining from invitation, update the invitation status
      if (joinDialog.isInvited) {
        await supabase
          .from('group_invitations' as any)
          .update({ status: 'accepted' })
          .eq('group_id', joinDialog.group.id)
          .eq('invitee_id', user?.id)
          .eq('status', 'pending');
      }
      
      setJoinDialog({ open: false, group: null, isInvited: false });
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    } finally {
      setJoining(false);
    }
  };
  
  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user?.id
        });
      
      if (error) throw error;
      
      toast.success('Successfully joined group');
      navigate(`/chat/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-8">Explore Groups</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Join by Code */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Join by Code</h2>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter group code"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                />
                <Button onClick={handleJoinByCode} disabled={joining}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Search Groups */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Search Groups</h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Available Groups</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGroups.map(group => (
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-lg">{group.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Group ID: {group.code}
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => handleOpenJoinDialog(group)}
                  >
                    Join Group
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 border rounded-lg bg-white">
            <p className="text-gray-500">No public groups available to join</p>
          </div>
        )}
        
        {/* Join Group Dialog */}
        <Dialog open={joinDialog.open} onOpenChange={(open) => setJoinDialog({ ...joinDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join {joinDialog.group?.name}</DialogTitle>
            </DialogHeader>
            
            {joinDialog.group?.is_private && !joinDialog.isInvited ? (
              <div className="py-4">
                <p className="mb-4">This is a private group. Please enter the password to join.</p>
                <Input
                  type="password"
                  placeholder="Group password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="py-4">
                <p>
                  {joinDialog.isInvited 
                    ? "You've been invited to join this group." 
                    : "Are you sure you want to join this group?"}
                </p>
                {joinDialog.isInvited && joinDialog.group?.is_private && (
                  <div className="mt-4">
                    <Input
                      type="password"
                      placeholder="Group password"
                      value="********"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Password will be handled automatically</p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setJoinDialog({ open: false, group: null, isInvited: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinWithPassword}
                disabled={joining}
              >
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Join Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ExploreGroups;
