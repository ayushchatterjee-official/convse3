import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Phone, UserPlus, Check, X } from 'lucide-react';

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

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
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
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          group_id,
          sender_id,
          created_at,
          read,
          content,
          invitation_id,
          groups!notifications_group_id_fkey (name),
          profiles!notifications_sender_id_fkey (name, profile_pic)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedNotifications = data.map((n: any): Notification => ({
        id: n.id,
        type: n.type,
        group_id: n.group_id,
        group_name: n.groups?.name || 'Unknown Group',
        sender_id: n.sender_id,
        sender_name: n.profiles?.name || 'Unknown User',
        sender_profile_pic: n.profiles?.profile_pic,
        created_at: n.created_at,
        read: n.read,
        content: n.content,
        invitation_id: n.invitation_id
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.type === 'message' || notification.type === 'voice_call') {
      navigate(`/chat/${notification.group_id}`);
    } else if (notification.type === 'invitation') {
      navigate('/notifications');
    }
    
    setOpen(false);
  };

  const handleInvitation = async (notification: Notification, accept: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'voice_call':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'invitation':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center p-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={() => navigate('/notifications')}
            >
              View All
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length > 0 ? (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`p-3 cursor-pointer ${!notification.read ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      {notification.sender_profile_pic ? (
                        <AvatarImage src={notification.sender_profile_pic} />
                      ) : (
                        <AvatarFallback>{notification.sender_name[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-1">
                          {getNotificationIcon(notification.type)}
                          {notification.group_name}
                        </p>
                        <span className="text-xs text-gray-500">{getTimeAgo(notification.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{notification.content}</p>
                      
                      {notification.type === 'invitation' && notification.invitation_id && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => handleInvitation(notification, true, e)}
                            disabled={processingId === notification.id}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleInvitation(notification, false, e)}
                            disabled={processingId === notification.id}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
