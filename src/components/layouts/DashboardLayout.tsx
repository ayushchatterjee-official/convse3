
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/notification/NotificationDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  FileText,
  Shield,
  MessageCircle
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Posts', href: '/posts', icon: FileText },
    { name: 'Community', href: '/community', icon: MessageCircle },
    { name: 'Explore Groups', href: '/explore', icon: Users },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ];

  // Add admin link if user is admin
  if (profile?.account_status === 'admin') {
    navigation.push({ name: 'Admin', href: '/admin', icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <img 
                  src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192" 
                  alt="Connectiverse" 
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold text-gray-900">Connectiverse</span>
              </Link>
              
              <div className="hidden md:flex space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <NotificationDropdown />
              
              {profile && (
                <div className="flex items-center space-x-3">
                  <Link to="/profile" className="flex items-center space-x-2 hover:opacity-80">
                    <Avatar className="h-8 w-8">
                      {profile.profile_pic ? (
                        <AvatarImage src={profile.profile_pic} alt={profile.name} />
                      ) : (
                        <AvatarFallback>
                          {profile.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                      {profile.account_status === 'admin' && (
                        <Badge variant="destructive" className="text-xs">Admin</Badge>
                      )}
                      {profile.account_status === 'verified' && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </Link>
                  
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
