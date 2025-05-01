
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';

interface VideoCallCardProps {
  roomCode: string;
  isAdmin?: boolean;
  participantCount?: number;
  lastActivity?: string;
}

export const VideoCallCard: React.FC<VideoCallCardProps> = ({
  roomCode,
  isAdmin = false,
  participantCount = 0,
  lastActivity,
}) => {
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          Video Call
          {isAdmin && (
            <Badge variant="outline" className="ml-2 text-xs">
              Admin
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Room Code: {roomCode}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm space-y-1">
          <p className="text-gray-500 dark:text-gray-400">
            Participants: {participantCount}
          </p>
          {lastActivity && (
            <p className="text-gray-500 dark:text-gray-400">
              Last activity: {formatTime(lastActivity)}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link to={`/video-call/${roomCode}`} className="w-full">
          <Button variant="default" className="w-full">
            {isAdmin ? 'Resume Call' : 'Join Call'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
