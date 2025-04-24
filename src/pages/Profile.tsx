
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const Profile = () => {
  const { user, profile, signIn, deleteAccount, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (profile) {
      setName(profile.name || '');
      setCountry(profile.country || '');
      setProfilePic(profile.profile_pic || '');
      if (profile.dob) {
        setDob(new Date(profile.dob));
      }
    }
  }, [user, profile, loading, navigate]);
  
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
  
  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      
      await updateProfile({
        name,
        country,
        profile_pic: profilePic || null,
        dob: dob ? dob.toISOString() : null,
      });
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user?.email || email !== user.email) {
      toast.error('Email address does not match');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // First authenticate the user to confirm identity
      await signIn(email, password);
      
      // Then delete the account
      await deleteAccount();
      
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center space-y-2">
                  <Avatar className="w-32 h-32">
                    {profilePic ? (
                      <AvatarImage src={profilePic} alt={name} />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {name ? getInitials(name) : 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                        <span className="font-medium">
                          {profile?.account_status === 'admin' && '👑 '}
                          {profile?.account_status === 'verified' && '✓ '}
                          {profile?.account_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                        <span>
                          {profile?.date_joined ? formatDate(profile.date_joined) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profile-pic">Profile Picture URL</Label>
                  <Input 
                    id="profile-pic" 
                    value={profilePic} 
                    onChange={(e) => setProfilePic(e.target.value)} 
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input 
                      id="country" 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dob ? format(dob, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dob}
                          onSelect={setDob}
                          initialFocus
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Your Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Confirm your email</Label>
              <Input 
                id="confirm-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user?.email || 'your-email@example.com'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Enter your password</Label>
              <Input 
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Profile;
