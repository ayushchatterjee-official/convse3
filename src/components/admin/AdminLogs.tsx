
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AdminLog {
  id: string;
  user_id: string | null;
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
  profile_pic?: string;
  account_status: string;
  country?: string;
  date_joined: string;
  last_login: string;
  dob?: string;
}

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data: logsData, error: logsError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Get user IDs that are not null
      const userIds = logsData
        .map(log => log.user_id)
        .filter((id): id is string => id !== null);

      if (userIds.length === 0) {
        setLogs(logsData as AdminLog[]);
        return;
      }

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create lookup map
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Format logs with user names
      const formattedLogs: AdminLog[] = logsData.map(log => ({
        ...log,
        user_name: log.user_id ? profilesMap.get(log.user_id)?.name || 'Unknown User' : 'System',
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent as string | null,
        user_id: log.user_id as string | null
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load admin logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setSelectedUser(data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'user_signup':
        return 'success';
      case 'user_login':
        return 'info';
      case 'user_delete_account':
        return 'destructive';
      case 'group_created':
        return 'success';
      case 'group_deleted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg">Loading admin logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin Activity Logs</h2>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {logs.length > 0 ? (
          logs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-medium">
                        User: {log.user_name || 'Unknown'}
                      </p>
                      
                      {log.action_details && (
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(log.action_details as Record<string, any>).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {log.ip_address && (
                        <p className="text-xs text-muted-foreground">
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {log.user_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUserDetails(log.user_id!)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No admin logs available
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedUser.profile_pic ? (
                  <img
                    src={selectedUser.profile_pic}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <Badge variant={selectedUser.account_status === 'admin' ? 'admin' : 'secondary'}>
                    {selectedUser.account_status}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined: {formatDate(selectedUser.date_joined)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Last Login: {formatDate(selectedUser.last_login)}</span>
                </div>
                
                {selectedUser.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Country: {selectedUser.country}</span>
                  </div>
                )}
                
                {selectedUser.dob && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>DOB: {new Date(selectedUser.dob).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
