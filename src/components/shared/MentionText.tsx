
import React from 'react';
import { ClickableUsername } from '@/components/user/ClickableUsername';

interface MentionTextProps {
  text: string;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Split text by mention pattern (@username or @first-name-last-name)
  const parts = text.split(/(@[\w-]+)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1); // Remove @ symbol
          const displayName = username.replace(/-/g, ' '); // Replace hyphens with spaces for display
          
          return (
            <ClickableUsername
              key={index}
              username={displayName}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
