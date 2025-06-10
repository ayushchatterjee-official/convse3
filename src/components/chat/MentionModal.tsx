
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface GroupMember {
  id: string;
  name: string;
  profile_pic?: string;
}

interface MentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: GroupMember) => void;
  groupId: string;
}

export const MentionModal = ({ isOpen, onClose, onSelectUser, groupId }: MentionModalProps) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, groupId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      if (groupId === 'community') {
        // For community chat, get all users who have sent messages in community_chats
        const { data: communityUsers, error } = await supabase
          .from('community_chats')
          .select('user_id')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const uniqueUserIds = [...new Set(communityUsers?.map(msg => msg.user_id) || [])];
        
        if (uniqueUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, profile_pic')
            .in('id', uniqueUserIds);

          const formattedMembers = profilesData?.map(profile => ({
            id: profile.id,
            name: profile.name,
            profile_pic: profile.profile_pic
          })) || [];

          setMembers(formattedMembers);
        }
      } else {
        // For regular groups, use the existing logic
        const { data: membersData, error } = await supabase
          .from('group_members')
          .select(`
            user_id,
            profiles!inner (
              id,
              name,
              profile_pic
            )
          `)
          .eq('group_id', groupId)
          .eq('banned', false);

        if (error) throw error;

        const formattedMembers = membersData?.map(member => ({
          id: member.profiles.id,
          name: member.profiles.name,
          profile_pic: member.profiles.profile_pic
        })) || [];

        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: GroupMember) => {
    onSelectUser(user);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-md">
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search users to mention..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? 'Loading users...' : 'No users found.'}
            </CommandEmpty>
            <CommandGroup heading={groupId === 'community' ? 'Community Users' : 'Group Members'}>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  onSelect={() => handleSelectUser(member)}
                  className="flex items-center gap-2 p-2 cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    {member.profile_pic ? (
                      <AvatarImage src={member.profile_pic} alt={member.name} />
                    ) : (
                      <AvatarFallback>
                        {member.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{member.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
