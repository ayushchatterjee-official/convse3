
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  User,
  Home,
  Settings,
  Search,
  LogOut,
  ShieldCheck,
  Menu,
  MessageSquare,
  Video
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  noPadding = false,
}) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Explore',
      href: '/explore',
      icon: <Search className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Video Call',
      href: '/video-call',
      icon: <Video className="mr-2 h-4 w-4" />,
      highlight: true,
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: <User className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ];

  if (isAdmin) {
    navItems.push({
      label: 'Admin Panel',
      href: '/admin',
      icon: <ShieldCheck className="mr-2 h-4 w-4" />,
    });
  }

  const navigationLinks = (
    <div className="space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors
            ${item.highlight 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar for desktop */}
      {!isMobile && (
        <div className="hidden md:flex md:w-64 md:flex-col border-r dark:border-gray-800">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
            <div className="flex items-center justify-center h-16">
              <Link to="/dashboard" className="flex items-center gap-2">
                <img 
                  src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192" 
                  alt="Connectiverse" 
                  className="h-8 w-8" 
                />
                <span className="text-lg font-semibold dark:text-white">
                  Connectiverse
                </span>
              </Link>
            </div>
            <div className="mt-5 flex-1 px-3">
              {navigationLinks}
            </div>
            <div className="p-4 border-t dark:border-gray-800">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <Sidebar>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-center h-16 border-b dark:border-gray-800">
              <Link to="/dashboard" className="flex items-center gap-2">
                <img 
                  src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192" 
                  alt="Connectiverse" 
                  className="h-8 w-8" 
                />
                <span className="text-lg font-semibold dark:text-white">
                  Connectiverse
                </span>
              </Link>
            </div>
            <div className="mt-5 flex-1 px-3">
              {navigationLinks}
            </div>
            <div className="p-4 border-t dark:border-gray-800">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </Sidebar>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navbar for mobile */}
        {isMobile && (
          <header className="border-b py-3 px-4 flex items-center justify-between dark:border-gray-800">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => document.querySelector('.sidebar')?.classList.toggle('sidebar-visible')}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
              <Link to="/dashboard" className="ml-2 flex items-center gap-2">
                <img 
                  src="https://cdn.glitch.global/379d6b26-1c93-4dc3-b34f-29fe75cab18e/favicon1.png?v=1716545083192" 
                  alt="Connectiverse" 
                  className="h-6 w-6" 
                />
                <span className="font-semibold text-sm dark:text-white">
                  Connectiverse
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {profile?.profile_pic ? (
                        <AvatarImage src={profile.profile_pic} />
                      ) : (
                        <AvatarFallback>
                          {profile?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {profile?.name || 'User'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/video-call')}>
                    <Video className="mr-2 h-4 w-4" />
                    Video Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* Top navbar for desktop */}
        {!isMobile && (
          <header className="border-b py-3 px-4 flex items-center justify-end dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="px-3 py-2 text-sm rounded-md">
                <MessageSquare className="h-5 w-5" />
              </Link>
              
              <Link to="/video-call" className="px-3 py-2 text-sm rounded-md">
                <Video className="h-5 w-5" />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {profile?.profile_pic ? (
                        <AvatarImage src={profile.profile_pic} />
                      ) : (
                        <AvatarFallback>
                          {profile?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {profile?.name || 'User'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}
        
        <main className={`flex-1 overflow-auto ${noPadding ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
