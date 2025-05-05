
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
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { Group } from '@/hooks/useGroupList';
import { GroupInviteDialog } from './GroupInviteDialog';
import { useGroupNavigation } from '@/hooks/useGroupNavigation';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface GroupActionsProps {
  group: Group;
}

export const GroupActions: React.FC<GroupActionsProps> = ({ group }) => {
  const navigate = useNavigate();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { navigateToChat, leaveGroup, deleteGroup, processingGroupId } = useGroupNavigation();
  const { isAdmin } = useAuth();
  
  const handleVoiceCall = () => {
    navigate(`/voice-call/${group.id}`);
  };

  const handleChatNavigation = () => {
    navigateToChat(group.id);
  };

  const handleLeaveGroup = async () => {
    await leaveGroup(group.id);
  };

  const handleDeleteGroup = async () => {
    setDeleteDialogOpen(false);
    await deleteGroup(group.id);
  };

  const isProcessing = processingGroupId === group.id;

  return (
    <>
      <div className="flex gap-2 w-full">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={handleChatNavigation}
          disabled={isProcessing}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Open Chat
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isProcessing}>
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
              onClick={handleLeaveGroup}
              className="text-orange-600 dark:text-orange-400"
              disabled={isProcessing}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Group
            </DropdownMenuItem>
            
            {(group.is_admin || isAdmin) && (
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 dark:text-red-400"
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone.
              All messages and group data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GroupInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        groupId={group.id}
        groupName={group.name}
      />
    </>
  );
};
