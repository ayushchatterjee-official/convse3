
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, RefreshCw, Calendar, User, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminLog {
  id: string;
  user_id: string;
  action_type: string;
  action_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

interface UserDetails {
  id: string;
  name: string;
  account_status: string;
  date_joined: string;
  last_login: string;
  country: string | null;
  dob: string | null;
  profile_pic: string | null;
  banned: boolean | null;
}

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
      // Set up automatic cleanup of old notifications
      cleanupOldNotifications();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data: logsData, error: logsError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Get unique user IDs to fetch user names
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean))];
      
      let usersData = [];
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          usersData = users || [];
        }
      }

      // Create a map for quick lookup
      const usersMap = new Map(usersData.map(u => [u.id, u.name]));

      // Add user names to logs
      const logsWithUserNames = logsData?.map(log => ({
        ...log,
        user_name: usersMap.get(log.user_id) || 'Unknown User'
      })) || [];

      setLogs(logsWithUserNames);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      toast.error('Failed to fetch admin logs');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldNotifications = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_notifications');
      if (error) {
        console.error('Error cleaning up notifications:', error);
      } else if (data > 0) {
        console.log(`Cleaned up ${data} old notifications`);
      }
    } catch (error) {
      console.error('Error in notification cleanup:', error);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      setUserDetailsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setSelectedUser(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'user_signup':
        return 'default';
      case 'user_login':
        return 'secondary';
      case 'user_delete_account':
        return 'destructive';
      case 'group_created':
        return 'default';
      case 'group_deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Admin Activity Logs
          </CardTitle>
          <Button onClick={fetchLogs} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                      <span className="font-medium">{log.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                      {log.user_id && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchUserDetails(log.user_id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                User Details
                              </DialogTitle>
                            </DialogHeader>
                            {userDetailsLoading ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                              </div>
                            ) : selectedUser ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                                    <p className="font-medium">{selectedUser.name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                                    <p className="font-medium">
                                      <Badge variant={selectedUser.account_status === 'admin' ? 'default' : 'secondary'}>
                                        {selectedUser.account_status}
                                      </Badge>
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date Joined</label>
                                    <p>{formatDate(selectedUser.date_joined)}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                                    <p>{formatDate(selectedUser.last_login)}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                                    <p>{selectedUser.country || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                                    <p>{selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                    <p className="text-xs font-mono bg-muted p-1 rounded">{selectedUser.id}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <p>
                                      {selectedUser.banned ? (
                                        <Badge variant="destructive">Banned</Badge>
                                      ) : (
                                        <Badge variant="default">Active</Badge>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground py-4">No user details available</p>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                  
                  {log.action_details && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Details:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {JSON.stringify(log.action_details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {(log.ip_address || log.user_agent) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {log.ip_address && <div>IP: {log.ip_address}</div>}
                      {log.user_agent && <div>User Agent: {log.user_agent}</div>}
                    </div>
                  )}
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
