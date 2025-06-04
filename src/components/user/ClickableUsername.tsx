
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ClickableUsernameProps {
  username: string;
  className?: string;
}

export const ClickableUsername = ({ username, className = "" }: ClickableUsernameProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/~${username}`);
  };

  return (
    <span
      onClick={handleClick}
      className={`cursor-pointer hover:text-blue-500 hover:underline transition-colors ${className}`}
    >
      {username}
    </span>
  );
};
