
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, PhoneCall } from 'lucide-react';
import { Group } from '@/hooks/useGroupList';

interface GroupActionsProps {
  group: Group;
}

export const GroupActions: React.FC<GroupActionsProps> = ({ group }) => {
  return (
    <div className="flex items-center gap-2">
      <Link to={`/chat/${group.id}`} className="flex-1">
        <Button variant="default" className="w-full flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </Link>
      
      <Link to={`/voice-call/${group.id}`} className="flex-1">
        <Button variant="outline" className="w-full flex items-center gap-2">
          <PhoneCall className="h-4 w-4" />
          Voice Call
        </Button>
      </Link>
    </div>
  );
};
