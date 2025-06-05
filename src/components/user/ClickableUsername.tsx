
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ClickableUsernameProps {
  username: string;
  className?: string;
  onClick?: () => void;
}

export const ClickableUsername = ({ username, className = "", onClick }: ClickableUsernameProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/?usr=${username}`);
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`cursor-pointer ${className}`}
    >
      {username}
    </span>
  );
};
