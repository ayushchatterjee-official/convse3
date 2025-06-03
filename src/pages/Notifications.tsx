import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageSquare, Phone, UserPlus, Bell, Check, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'message' | 'voice_call' | 'invitation';
  group_id: string;
  group_name: string;
  sender_id: string;
  sender_name: string;
  sender_profile_pic?: string;
  created_at: string;
  read: boolean;
  content: string;
  invitation_id?: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          group_id,
          sender_id,
          created_at,
          read,
          content,
          invitation_id
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
      }

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        return;
      }

      // Get unique group IDs and sender IDs
      const groupIds = [...new Set(notificationsData.map(n => n.group_id).filter(Boolean))];
      const senderIds = [...new Set(notificationsData.map(n => n.sender_id).filter(Boolean))];

      // Fetch group names
      let groupsData = [];
      if (groupIds.length > 0) {
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);
        
        if (groupsError) {
          console.error('Error fetching groups:', groupsError);
        } else {
          groupsData = groups || [];
        }
      }

      // Fetch sender profiles
      let profilesData = [];
      if (senderIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, profile_pic')
          .in('id', senderIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Create lookup maps
      const groupsMap = new Map(groupsData.map(g => [g.id, g]));
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));

      // Format notifications with joined data
      const formattedNotifications = notificationsData.map((n): Notification => {
        const group = groupsMap.get(n.group_id);
        const profile = profilesMap.get(n.sender_id);

        return {
          id: n.id,
          type: n.type,
          group_id: n.group_id,
          group_name: group?.name || 'Unknown Group',
          sender_id: n.sender_id,
          sender_name: profile?.name || 'Unknown User',
          sender_profile_pic: profile?.profile_pic,
          created_at: n.created_at,
          read: n.read,
          content: n.content,
          invitation_id: n.invitation_id
        };
      });

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.type === 'message' || notification.type === 'voice_call') {
      navigate(`/chat/${notification.group_id}`);
    }
  };

  const handleInvitation = async (notification: Notification, accept: boolean) => {
    if (!notification.invitation_id || processingId === notification.id) return;
    
    setProcessingId(notification.id);
    
    try {
      // Update the invitation status
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', notification.invitation_id);
      
      if (inviteError) throw inviteError;

      // If accepted, add user to the group
      if (accept) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            user_id: user?.id,
            group_id: notification.group_id,
          });
        
        if (memberError) throw memberError;
        
        toast.success(`You've joined ${notification.group_name}`);
      } else {
        toast.info(`You declined the invitation to ${notification.group_name}`);
      }
      
      // Mark the notification as read
      await markAsRead(notification.id);
      
      // Refresh notifications
      fetchNotifications();
      
    } catch (error) {
      console.error('Error handling invitation:', error);
      toast.error('Failed to process invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'voice_call':
        return <Phone className="h-5 w-5 text-green-500" />;
      case 'invitation':
        return <UserPlus className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderNotificationCard = (notification: Notification) => (
    <Card 
      key={notification.id}
      className={`mb-3 ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {notification.sender_profile_pic ? (
              <AvatarImage src={notification.sender_profile_pic} />
            ) : (
              <AvatarFallback>{notification.sender_name?.charAt(0) || 'U'}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {getNotificationIcon(notification.type)}
                <p className="text-sm font-medium">
                  {notification.group_name}
                  {!notification.read && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-800">New</Badge>}
                </p>
              </div>
              <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{notification.content}</p>
            
            {notification.type === 'invitation' && notification.invitation_id && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleInvitation(notification, true)}
                  disabled={processingId === notification.id}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInvitation(notification, false)}
                  disabled={processingId === notification.id}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="mt-2 md:mt-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="unread">
          <TabsList>
            <TabsTrigger value="unread">
              Unread 
              {unreadNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">
              Read
              {readNotifications.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {readNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unread" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : unreadNotifications.length > 0 ? (
              <div>
                {unreadNotifications.map(notification => renderNotificationCard(notification))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No unread notifications</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="read" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : readNotifications.length > 0 ? (
              <div>
                {readNotifications.map(notification => renderNotificationCard(notification))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No read notifications</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
