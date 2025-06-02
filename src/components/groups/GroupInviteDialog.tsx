
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  profile_pic: string | null;
}

interface GroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export const GroupInviteDialog: React.FC<GroupInviteDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  groupName
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  
  useEffect(() => {
    if (!open) return;
    if (searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        // Get existing group member IDs
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        const memberIds = members?.map(m => m.user_id) || [];
        memberIds.push(user?.id || ''); // Add current user to exclude list

        // Search for users by name, excluding existing members
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, profile_pic')
          .ilike('name', `%${searchQuery}%`)
          .not('id', 'in', `(${memberIds.map(id => `"${id}"`).join(',')})`)
          .limit(10);

        if (error) throw error;

        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        toast.error('Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, open, groupId, user?.id]);

  const inviteUser = async (inviteeId: string) => {
    if (!user) return;
    
    setInviting(inviteeId);
    try {
      // Get the invitee's name
      const { data: inviteeData, error: inviteeError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', inviteeId)
        .single();

      if (inviteeError) throw inviteeError;
      const inviteeName = inviteeData.name;

      // Create group invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('group_invitations')
        .insert({
          inviter_id: user.id,
          invitee_id: inviteeId,
          group_id: groupId,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) throw inviteError;
      
      // Create notification for the invitee
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: inviteeId,
          sender_id: user.id,
          group_id: groupId,
          invitation_id: invitation.id,
          type: 'invitation',
          content: `${user.name || 'Someone'} invited you to join ${groupName}`
        });

      if (notifError) throw notifError;

      toast.success(`Invitation sent to ${inviteeName}`);
      
      // Remove invited user from list
      setUsers(users.filter(u => u.id !== inviteeId));
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
          <DialogDescription>
            Invite users to join {groupName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search users by name"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {searchQuery.length < 2 ? (
            <p className="text-sm text-center text-gray-500 py-2">
              Type at least 2 characters to search
            </p>
          ) : loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-center text-gray-500 py-4">
              No users found or all users are already members
            </p>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-2">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {user.profile_pic ? (
                        <AvatarImage src={user.profile_pic} />
                      ) : (
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => inviteUser(user.id)}
                    disabled={inviting === user.id}
                  >
                    {inviting === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Invite'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
