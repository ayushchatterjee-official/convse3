
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Group } from '@/hooks/useGroupList';
import { GroupActions } from './GroupActions';

interface GroupCardProps {
  group: Group;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Avatar className="h-10 w-10">
            {group.profile_pic ? (
              <AvatarImage src={group.profile_pic} alt={group.name} />
            ) : (
              <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex items-center">
            {group.is_admin && (
              <Badge variant="outline" className="ml-2">
                Admin
              </Badge>
            )}
            {group.is_private ? (
              <Lock className="h-4 w-4 ml-2 text-amber-500" />
            ) : (
              <Unlock className="h-4 w-4 ml-2 text-green-500" />
            )}
          </div>
        </div>
        <CardTitle className="mt-2">{group.name}</CardTitle>
        <CardDescription>
          Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {/* Group description or additional info can go here */}
      </CardContent>
      <CardFooter>
        <GroupActions group={group} />
      </CardFooter>
    </Card>
  );
};
