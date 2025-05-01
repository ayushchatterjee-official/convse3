
import { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, Loader2, Upload, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { uploadFile } from '@/lib/fileUpload';

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
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      // Validate date format and age if dob is provided
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 7) {
          toast.error("You must be at least 7 years old");
          return;
        }

        if (isNaN(birthDate.getTime())) {
          toast.error("Please enter a valid date in YYYY-MM-DD format");
          return;
        }
      }

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      const fileUrl = await uploadFile(file, 'user_files', user.id);
      
      if (fileUrl) {
        setProfilePic(fileUrl);
        setShowImageUpload(false);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearPreviewImage = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                  <Avatar className="w-32 h-32 cursor-pointer relative group" onClick={() => setShowImageUpload(true)}>
                    {previewImage ? (
                      <AvatarImage src={previewImage} alt={name} />
                    ) : profilePic ? (
                      <AvatarImage src={profilePic} alt={name} />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {name ? getInitials(name) : 'U'}
                      </AvatarFallback>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowImageUpload(true)}
                  >
                    Change Photo
                  </Button>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                        <span className="font-medium">
                          {profile?.account_status === 'admin' && '👑 '}
                          {profile?.account_status === 'verified' && '✓ '}
                          {profile?.account_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-800">
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
                    <Input
                      type="date"
                      value={dob ? new Date(dob).toISOString().split('T')[0] : ''}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 7)).toISOString().split('T')[0]}
                      onChange={(e) => setDob(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
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
      
      {/* Image Upload Dialog */}
      <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
            <DialogDescription>
              Choose an image file to use as your profile picture.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {previewImage ? (
              <div className="relative w-full h-64 mx-auto">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-full object-contain rounded-md"
                />
                <Button 
                  variant="destructive" 
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearPreviewImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                onClick={triggerFileInput}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Click to select a file</p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, GIF</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageUpload(false)}>
              Cancel
            </Button>
            <Button
              onClick={triggerFileInput}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              disabled={!!previewImage}
            >
              Select Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete Your Account</DialogTitle>
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
