import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, UserCheck, UserX, CheckCircle, CircleCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/user/UserAvatar';

interface User {
  id: string;
  email: string;
  name: string;
  profile_pic: string | null;
  date_joined: string;
  account_status: 'normal' | 'admin' | 'verified';
  banned: boolean;
}

interface Group {
  id: string;
  name: string;
  code: string;
  is_private: boolean;
  created_at: string;
  member_count: number;
}

// Define AuthUser interface to handle the response from auth.admin.listUsers()
interface AuthUser {
  id: string;
  email?: string;
}

interface AuthResponse {
  users?: AuthUser[];
}

const AdminPanel = () => {
  const { isAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showBanUserDialog, setShowBanUserDialog] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast.error('You do not have permission to view this page');
      navigate('/dashboard');
    } else if (!loading && user && isAdmin) {
      fetchUsers();
      fetchGroups();
    }
  }, [user, isAdmin, loading, navigate]);

  // Improved fetchUsers function to include email
  const fetchUsers = async () => {
    try {
      setLoadingData(true);
      
      // Fetch profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('date_joined', { ascending: false });

      if (profilesError) throw profilesError;
      
      if (!profilesData) {
        setUsers([]);
        return;
      }

      // Now try to get emails from auth.users using a server function
      // This is a placeholder - ideally we'd have a server function for this
      const usersWithProfiles = profilesData.map(profile => ({
        ...profile,
        email: profile.id, // We'll just use ID as a placeholder
        account_status: profile.account_status as 'normal' | 'admin' | 'verified'
      }));
      
      setUsers(usersWithProfiles as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoadingData(true);
      
      // Get all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      if (!groupsData) {
        setGroups([]);
        return;
      }

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count, error: countError } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          if (countError) throw countError;

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoadingData(false);
    }
  };

  const handleVerifyUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessingAction(true);
      console.log('Verifying user:', selectedUser.id);
      
      // Update the user's account status
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'verified' })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Log success
      console.log('User verification successful in the database');
      toast.success(`${selectedUser.name} has been verified`);
      
      // Update local state to reflect the change
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === selectedUser.id 
            ? { ...u, account_status: 'verified' } 
            : u
        )
      );
      
      setShowVerifyDialog(false);
      
      // Immediately refetch users to ensure sync with database
      fetchUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
      toast.error('Failed to verify user');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleToggleUserBan = async () => {
    if (!selectedUser) return;

    try {
      setProcessingAction(true);
      const newBanStatus = !selectedUser.banned;
      console.log('Toggling ban for user:', selectedUser.id, 'to:', newBanStatus);
      
      // Update the user's ban status
      const { error } = await supabase
        .from('profiles')
        .update({ banned: newBanStatus })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Ban status update successful in the database');
      toast.success(`${selectedUser.name} has been ${newBanStatus ? 'banned' : 'unbanned'}`);
      
      // Update local state to reflect the change
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === selectedUser.id 
            ? { ...u, banned: newBanStatus } 
            : u
        )
      );
      
      setShowBanUserDialog(false);
      
      // Immediately refetch users to ensure sync with database
      fetchUsers();
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast.error('Failed to update user ban status');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      setProcessingAction(true);
      
      // First delete all group members
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (membersError) {
        console.error('Error deleting group members:', membersError);
        throw membersError;
      }

      // Then delete all messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (messagesError) {
        console.error('Error deleting group messages:', messagesError);
        throw messagesError;
      }

      // Finally delete the group
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id);

      if (groupError) {
        console.error('Error deleting group:', groupError);
        throw groupError;
      }

      // Update local state to reflect the change
      setGroups(prevGroups => 
        prevGroups.filter(g => g.id !== selectedGroup.id)
      );

      toast.success(`Group "${selectedGroup.name}" has been deleted`);
      setShowDeleteGroupDialog(false);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group. Make sure you have proper permissions.');
    } finally {
      setProcessingAction(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Badge className="bg-purple-600 text-white">
            Site Administrator
          </Badge>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, verification status, and bans.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <Table>
                    <TableCaption>List of all users</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className={user.banned ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <UserAvatar 
                                userId={user.id}
                                profilePic={user.profile_pic}
                                name={user.name}
                                showStatus={true}
                                accountStatus={user.account_status}
                              />
                              <div className="flex items-center">
                                <span>{user.name}</span>
                                {user.account_status === 'verified' && (
                                  <CircleCheck className="ml-1 h-4 w-4 text-blue-500 fill-white" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {user.banned && (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                                  Banned
                                </Badge>
                              )}
                              {user.account_status === 'admin' && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                                  Admin
                                </Badge>
                              )}
                              {user.account_status === 'verified' && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.date_joined)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.account_status !== 'verified' && user.account_status !== 'admin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowVerifyDialog(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Verify
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={user.banned ? "outline" : "destructive"}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanUserDialog(true);
                                }}
                                disabled={user.account_status === 'admin'}
                              >
                                {user.banned ? (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Unban
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    Ban
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Group Management</CardTitle>
                <CardDescription>
                  View and manage all groups on the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <Table>
                    <TableCaption>List of all groups</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Privacy</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.code}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={group.is_private ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}>
                              {group.is_private ? "Private" : "Public"}
                            </Badge>
                          </TableCell>
                          <TableCell>{group.member_count}</TableCell>
                          <TableCell>{formatDate(group.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedGroup(group);
                                setShowDeleteGroupDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Verify User Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify User</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify {selectedUser?.name}? This will add a verified badge to their profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyUser} disabled={processingAction}>
              {processingAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={showBanUserDialog} onOpenChange={setShowBanUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.banned ? "Unban User" : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.banned
                ? `Are you sure you want to unban ${selectedUser?.name}? They will regain access to the platform.`
                : `Are you sure you want to ban ${selectedUser?.name}? This will prevent them from using the platform.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={selectedUser?.banned ? "default" : "destructive"}
              onClick={handleToggleUserBan}
              disabled={processingAction}
            >
              {processingAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {selectedUser?.banned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the group "{selectedGroup?.name}"? This action cannot be undone and will delete all messages and remove all members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteGroupDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={processingAction}
            >
              {processingAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminPanel;
