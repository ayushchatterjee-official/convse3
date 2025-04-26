import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import GroupList from '@/components/groups/GroupList';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Groups</h1>
          <CreateGroupDialog />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GroupList />
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Join a Group</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-4 p-6 bg-white rounded-lg shadow-md">
            <div className="flex-1">
              <p className="text-gray-600 mb-2">
                Join an existing group by entering the group code
              </p>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Enter group code"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button>Join</Button>
              </div>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-gray-200 my-4 md:my-0 md:mx-4 h-auto md:h-16"></div>
            <div className="flex-1">
              <p className="text-gray-600 mb-2">
                Explore public groups that you can join
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/explore')}
                className="w-full md:w-auto"
              >
                Explore Public Groups
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
