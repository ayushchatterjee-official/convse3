
import React from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { GroupList } from '@/components/groups/GroupList';
import { ActiveCalls } from '@/components/video-call/ActiveCalls';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, MessageSquare } from 'lucide-react';

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
            <Link to="/video-call">
              <Button variant="default">Create Video Call</Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="chats">
          <TabsList>
            <TabsTrigger value="chats">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat Groups
            </TabsTrigger>
            <TabsTrigger value="calls">
              <Video className="mr-2 h-4 w-4" />
              Video Calls
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chats" className="mt-4">
            <GroupList />
          </TabsContent>
          <TabsContent value="calls" className="mt-4">
            <ActiveCalls />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
