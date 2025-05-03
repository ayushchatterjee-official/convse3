
// This file is read-only, but we need to add a button to initiate a voice call on the existing group cards.
// Since this file is read-only, we'll need to create a separate component for group actions.

import React from 'react';
import { useGroupList } from '@/hooks/useGroupList';
import { GroupCard } from './GroupCard';
import { GroupActions } from './GroupActions';

export const GroupList: React.FC = () => {
  const { groups, loading, error } = useGroupList();

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[140px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Error loading groups</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No groups yet. Create or join a group to start chatting!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {groups.map(group => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
};
