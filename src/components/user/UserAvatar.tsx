
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';
import { Badge } from '@/components/ui/badge';
import { CircleCheck } from 'lucide-react';

interface UserAvatarProps {
  userId: string;
  profilePic?: string | null;
  name?: string;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  accountStatus?: 'normal' | 'admin' | 'verified';
  clickable?: boolean;
  onClick?: () => void;
  showBadgeInline?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId,
  profilePic,
  name,
  showStatus = true,
  size = 'md',
  accountStatus,
  clickable = true,
  onClick,
  showBadgeInline = false
}) => {
  const navigate = useNavigate();
  
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

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable && name) {
      navigate(`/?usr=${name}`);
    }
  };
  
  if (showBadgeInline) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <Avatar 
            className={`${sizeClasses[size]} ${clickable ? 'cursor-pointer' : ''}`}
            onClick={handleClick}
          >
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
        
        <div className="flex items-center gap-1">
          <span className={clickable ? 'cursor-pointer hover:underline' : ''} onClick={handleClick}>
            {name}
          </span>
          {accountStatus === 'verified' && (
            <CircleCheck className="h-4 w-4 text-blue-500 fill-blue-100" />
          )}
          {accountStatus === 'admin' && (
            <Badge variant="admin" className="text-xs">Admin</Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <Avatar 
        className={`${sizeClasses[size]} ${clickable ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
      >
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
      
      {accountStatus === 'verified' && (
        <div className="absolute -top-1 -right-1">
          <CircleCheck className="h-4 w-4 text-blue-500 fill-white" />
        </div>
      )}
    </div>
  );
};
