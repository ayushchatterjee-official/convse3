
import { supabase } from '@/integrations/supabase/client';

// This function checks if notifications and invitations tables exist
export async function setupNotificationsSystem() {
  try {
    // Check if notifications table exists
    const { error: notificationCheckError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    // If the table doesn't exist, log an error
    if (notificationCheckError && notificationCheckError.message.includes('does not exist')) {
      console.error('Notifications table does not exist:', notificationCheckError);
      console.log('Please run required SQL migrations to create the notifications system tables');
    } else {
      console.log('Notifications system seems to be set up correctly');
    }
    
    // Check if group_invitations table exists
    const { error: invitationsCheckError } = await supabase
      .from('group_invitations')
      .select('id')
      .limit(1);

    if (invitationsCheckError && invitationsCheckError.message.includes('does not exist')) {
      console.error('Group invitations table does not exist:', invitationsCheckError);
      console.log('Please run required SQL migrations to create the group invitations table');
    } else {
      console.log('Group invitations system seems to be set up correctly');
    }
  } catch (error) {
    console.error('Error checking notifications system:', error);
  }
}
