
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Group {
  id: string;
  name: string;
  profile_pic: string | null;
  is_private: boolean;
  created_at: string;
  is_member?: boolean;
  is_admin?: boolean;
}

export const useGroupList = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            profile_pic,
            is_private,
            created_at,
            group_members!inner (
              user_id,
              is_admin
            )
          `)
          .eq('group_members.user_id', supabase.auth.getUser().then(({ data }) => data.user?.id))
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        const formattedGroups = data.map((group: any) => ({
          id: group.id,
          name: group.name,
          profile_pic: group.profile_pic,
          is_private: group.is_private,
          created_at: group.created_at,
          is_member: true,
          is_admin: group.group_members.some((m: any) => m.is_admin)
        }));
        
        setGroups(formattedGroups);
      } catch (error: any) {
        console.error('Error fetching groups:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
    
    const subscription = supabase
      .channel('groups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, fetchGroups)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, fetchGroups)
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
  
  return { groups, loading, error };
};
