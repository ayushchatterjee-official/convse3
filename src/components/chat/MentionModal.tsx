
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
    if (isOpen && groupId) {
      fetchGroupMembers();
    }
  }, [isOpen, groupId]);

  const fetchGroupMembers = async () => {
    try {
      setLoading(true);
      
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
    } catch (error) {
      console.error('Error fetching group members:', error);
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
          <CommandInput placeholder="Search members to mention..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? 'Loading members...' : 'No members found.'}
            </CommandEmpty>
            <CommandGroup heading="Group Members">
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
