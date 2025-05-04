
import React from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { GroupList } from '@/components/groups/GroupList';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
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
