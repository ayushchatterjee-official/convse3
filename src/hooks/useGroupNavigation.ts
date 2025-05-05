
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
        admins.some(admin => admin.user_id === user.id);
        
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
      
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave the group');
    } finally {
      setProcessingGroupId(null);
    }
  };
  
  const deleteGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setProcessingGroupId(groupId);
      
      // Check if the user is an admin
      const { data: member } = await supabase
        .from('group_members')
        .select('is_admin')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
        
      if (!member?.is_admin) {
        toast.error('Only admins can delete groups');
        return;
      }
      
      // Delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
        
      if (error) throw error;
      
      toast.success('Group deleted successfully');
      
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
    deleteGroup,
    processingGroupId
  };
};
