
import React from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { GroupList } from '@/components/groups/GroupList';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const Dashboard = () => {
  // Initialize online status tracking
  useOnlineStatus();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <CreateGroupDialog />
            <Link to="/explore">
              <Button variant="outline">Explore Groups</Button>
            </Link>
          </div>
        </div>
        
        <GroupList />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
