
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/user/UserAvatar';
import { CircleCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  profile_pic: string | null;
  account_status: 'normal' | 'admin' | 'verified';
  banned: boolean;
  date_joined: string;
  last_login: string;
  country: string | null;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      toast.error('You do not have permission to access this page');
      navigate('/dashboard');
      return;
    }
    
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users from the profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
        
      if (profilesError) throw profilesError;
      
      // Create a temporary array to hold merged data
      const tempUsers: User[] = [];
      
      // For each profile, try to get their email
      for (const profile of profilesData) {
        try {
          // Note: This approach might be limited based on permissions
          // We're relying on the profiles having email info or an alternative approach
          tempUsers.push({
            ...profile,
            email: 'Email not available', // Default value if email can't be retrieved
          });
        } catch (error) {
          console.error('Error processing user:', error);
        }
      }
      
      setUsers(tempUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string, currentStatus: string) => {
    if (processingUserId) return;
    
    try {
      setProcessingUserId(userId);
      
      // Check if the user is already verified
      const newAccountStatus = currentStatus === 'verified' ? 'normal' : 'verified';
      
      // Update the user's account status
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newAccountStatus })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, account_status: newAccountStatus } 
            : user
        )
      );
      
      toast.success(
        newAccountStatus === 'verified' 
          ? 'User has been verified' 
          : 'User verification has been removed'
      );
      
      // Make sure to refresh the data to reflect changes
      await fetchUsers();
      
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (processingUserId) return;
    
    try {
      setProcessingUserId(userId);
      
      // Toggle ban status
      const { error } = await supabase
        .from('profiles')
        .update({ banned: !isBanned })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, banned: !isBanned } 
            : user
        )
      );
      
      toast.success(
        !isBanned 
          ? 'User has been banned' 
          : 'User has been unbanned'
      );
      
      // Make sure to refresh the data to reflect changes
      await fetchUsers();
      
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast.error('Failed to update user ban status');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Helper function to format dates
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts, verification status, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted text-muted-foreground text-sm">
                      <th className="p-2 text-left">User</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Joined</th>
                      <th className="p-2 text-left">Last Login</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <UserAvatar 
                              userId={user.id}
                              profilePic={user.profile_pic}
                              name={user.name}
                              accountStatus={user.account_status}
                              size="sm"
                            />
                            <span>{user.name}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          {user.email}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 flex-wrap">
                            {user.account_status === 'admin' && (
                              <Badge variant="admin">Admin</Badge>
                            )}
                            {user.account_status === 'verified' && (
                              <Badge variant="verified">
                                <span className="flex items-center gap-1">
                                  <CircleCheck className="h-3 w-3" />
                                  Verified
                                </span>
                              </Badge>
                            )}
                            {user.banned && (
                              <Badge variant="destructive">Banned</Badge>
                            )}
                            {user.account_status === 'normal' && !user.banned && (
                              <Badge variant="secondary">Normal</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          {formatDate(user.date_joined)}
                        </td>
                        <td className="p-2">
                          {formatDate(user.last_login)}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            {user.account_status !== 'admin' && (
                              <>
                                <Button
                                  size="sm"
                                  variant={user.account_status === 'verified' ? "outline" : "secondary"}
                                  onClick={() => handleVerifyUser(user.id, user.account_status)}
                                  disabled={processingUserId === user.id}
                                >
                                  {user.account_status === 'verified' ? 'Unverify' : 'Verify'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.banned ? "outline" : "destructive"}
                                  onClick={() => handleBanUser(user.id, user.banned)}
                                  disabled={processingUserId === user.id}
                                >
                                  {user.banned ? 'Unban' : 'Ban'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
