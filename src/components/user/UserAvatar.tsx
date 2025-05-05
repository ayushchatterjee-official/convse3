
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';

interface UserAvatarProps {
  userId: string;
  profilePic?: string | null;
  name?: string;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId,
  profilePic,
  name,
  showStatus = true,
  size = 'md'
}) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };
  
  return (
    <div className="relative">
      <Avatar className={sizeClasses[size]}>
        {profilePic ? (
          <AvatarImage src={profilePic} alt={name || 'User'} />
        ) : (
          <AvatarFallback>
            {name ? getInitials(name) : 'U'}
          </AvatarFallback>
        )}
      </Avatar>
      
      {showStatus && (
        <OnlineStatus userId={userId} />
      )}
    </div>
  );
};
