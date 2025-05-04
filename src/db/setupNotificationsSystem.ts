
import { supabase } from '@/integrations/supabase/client';

// This function sets up the notification and invitation system tables in Supabase
export async function setupNotificationsSystem() {
  // Create group_invitations table
  const { error: invitationsError } = await supabase.rpc('create_group_invitations_table');
  if (invitationsError && !invitationsError.message.includes('already exists')) {
    console.error('Error creating group_invitations table:', invitationsError);
  }

  // Create notifications table
  const { error: notificationsError } = await supabase.rpc('create_notifications_table');
  if (notificationsError && !notificationsError.message.includes('already exists')) {
    console.error('Error creating notifications table:', notificationsError);
  }

  // Add the tables to the realtime publication
  const { error: realtimeError } = await supabase.rpc('enable_realtime_for_notifications');
  if (realtimeError && !realtimeError.message.includes('already exists')) {
    console.error('Error enabling realtime for notifications:', realtimeError);
  }
  
  console.log('Notifications system setup complete');
}
