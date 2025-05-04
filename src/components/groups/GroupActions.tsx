
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Phone,
  LogOut,
  Trash2,
  UserPlus
} from 'lucide-react';
import { Group } from '@/hooks/useGroupList';
import { GroupInviteDialog } from './GroupInviteDialog';

interface GroupActionsProps {
  group: Group;
  onLeave?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  onVoiceCall?: (groupId: string) => void;
}

export const GroupActions: React.FC<GroupActionsProps> = ({ 
  group, 
  onLeave,
  onDelete,
  onVoiceCall
}) => {
  const navigate = useNavigate();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const handleVoiceCall = () => {
    if (onVoiceCall) {
      onVoiceCall(group.id);
    } else {
      navigate(`/voice-call/${group.id}`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleVoiceCall}>
            <Phone className="mr-2 h-4 w-4" />
            Voice Call
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Users
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onLeave?.(group.id)}
            className="text-orange-600 dark:text-orange-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave Group
          </DropdownMenuItem>
          
          {group.is_admin && (
            <DropdownMenuItem 
              onClick={() => onDelete?.(group.id)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Group
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        groupId={group.id}
        groupName={group.name}
      />
    </>
  );
};
