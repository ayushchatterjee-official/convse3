
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Group } from './useGroupList';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useGroupNavigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);

  const navigateToChat = (groupId: string) => {
    navigate(`/chat/${groupId}`);
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setProcessingGroupId(groupId);
      
      // Check if user is the last admin
      const { data: admins } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_admin', true);
        
      const isLastAdmin = admins && admins.length === 1 && 
        admins.some(admin => admin.id && user.id);
        
      if (isLastAdmin) {
        toast.error('You cannot leave the group as you are the last admin.');
        return;
      }
      
      // Delete the group member record
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      toast.success('Successfully left the group');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave the group');
    } finally {
      setProcessingGroupId(null);
    }
  };
  
  const clearGroupChat = async (groupId: string) => {
    if (!user) return;
    
    try {
      setProcessingGroupId(groupId);
      console.log('Starting chat clear for group ID:', groupId);
      
      // Check if the user is an admin
      const { data: member } = await supabase
        .from('group_members')
        .select('is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single();
        
      const isAdmin = member?.is_admin || profile?.account_status === 'admin';
      console.log('User admin status:', isAdmin);
        
      if (!isAdmin) {
        toast.error('Only admins can clear group chat history');
        return false;
      }
      
      // Add a system message that chat was cleared
      await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: `Chat history was cleared by an admin`,
          content_type: 'text',
          is_system_message: true
        });
        
      // Delete all messages except the one we just added
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_by: user.id })
        .eq('group_id', groupId)
        .is('is_system_message', null);
        
      if (error) {
        console.error('Error clearing messages:', error);
        throw error;
      }
      
      console.log('Chat cleared successfully');
      toast.success('Chat history has been cleared');
      
      return true;
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat history');
      return false;
    } finally {
      setProcessingGroupId(null);
    }
  };
  
  const deleteGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setProcessingGroupId(groupId);
      console.log('Starting group deletion for group ID:', groupId);
      
      // Check if the user is an admin
      const { data: member } = await supabase
        .from('group_members')
        .select('is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single();
        
      const isAdmin = member?.is_admin || profile?.account_status === 'admin';
      console.log('User admin status:', isAdmin);
        
      if (!isAdmin) {
        toast.error('Only admins can delete groups');
        return;
      }
      
      // First delete all members
      console.log('Deleting group members...');
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
        
      if (membersError) {
        console.error('Error deleting group members:', membersError);
        throw membersError;
      }
      
      // Delete messages
      console.log('Deleting group messages...');
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('group_id', groupId);
        
      if (messagesError) {
        console.error('Error deleting group messages:', messagesError);
        throw messagesError;
      }
      
      // Delete voice calls
      console.log('Deleting group voice calls...');
      const { data: voiceCalls } = await supabase
        .from('group_voice_calls')
        .select('id')
        .eq('group_id', groupId);
        
      if (voiceCalls && voiceCalls.length > 0) {
        for (const call of voiceCalls) {
          // Delete voice call participants
          await supabase
            .from('voice_call_participants')
            .delete()
            .eq('call_id', call.id);
        }
        
        // Delete voice calls
        await supabase
          .from('group_voice_calls')
          .delete()
          .eq('group_id', groupId);
      }
      
      // Delete invitations
      console.log('Deleting group invitations...');
      const { error: invitationsError } = await supabase
        .from('group_invitations')
        .delete()
        .eq('group_id', groupId);
        
      if (invitationsError) {
        console.error('Error deleting group invitations:', invitationsError);
      }
      
      // Delete notifications related to the group
      console.log('Deleting group notifications...');
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('group_id', groupId);
        
      if (notificationsError) {
        console.error('Error deleting group notifications:', notificationsError);
      }
      
      // Finally delete the group
      console.log('Deleting the group itself...');
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
        
      if (groupError) {
        console.error('Error deleting group:', groupError);
        throw groupError;
      }
      
      console.log('Group deletion completed successfully');
      toast.success('Group deleted successfully');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete the group');
    } finally {
      setProcessingGroupId(null);
    }
  };
  
  return {
    navigateToChat,
    leaveGroup,
    clearGroupChat,
    deleteGroup,
    processingGroupId
  };
};
