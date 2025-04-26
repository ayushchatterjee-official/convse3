
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

const CreateGroupDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a group');
      return;
    }
    
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    
    if (isPrivate && !password.trim()) {
      toast.error('Password is required for private groups');
      return;
    }
    
    setLoading(true);
    try {
      // Generate a random code - we'll have the DB generate this for us now
      // Instead of generating the code here, let the database function handle it
      
      // Create group in database
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          is_private: isPrivate,
          password: isPrivate ? password : null,
          profile_pic: profilePic,
          code: await generateGroupCode() // Generate code client-side as a fallback
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id
        });
      
      if (memberError) throw memberError;
      
      toast.success('Group created successfully!');
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a random group code if needed
  const generateGroupCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const resetForm = () => {
    setGroupName('');
    setIsPrivate(false);
    setPassword('');
    setProfilePic(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Create a new chat group to connect with others
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="is-private" 
              checked={isPrivate} 
              onCheckedChange={(checked) => setIsPrivate(checked === true)} 
            />
            <Label htmlFor="is-private">Make this group private</Label>
          </div>
          
          {isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="password">Group Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="profile-pic">Group Icon (URL)</Label>
            <Input
              id="profile-pic"
              placeholder="Enter image URL"
              value={profilePic || ''}
              onChange={(e) => setProfilePic(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
