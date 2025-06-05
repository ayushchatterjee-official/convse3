
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, MapPin, UserCheck, Shield, Star, ExternalLink } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  profile_pic?: string;
  date_joined: string;
  country?: string;
  account_status: 'normal' | 'admin' | 'verified';
  dob?: string;
  last_login: string;
  show_profile?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      const typedProfile: UserProfile = {
        ...profileData,
        account_status: profileData.account_status as 'normal' | 'admin' | 'verified'
      };

      setProfile(typedProfile);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'admin':
        return <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
      case 'verified':
        return <Badge variant="secondary" className="gap-1"><UserCheck className="h-3 w-3" />Verified</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Star className="h-3 w-3" />Member</Badge>;
    }
  };

  const handleOpenProfile = () => {
    if (profile) {
      navigate(`/?usr=${profile.name}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  const showFullProfile = profile?.show_profile !== false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-16 w-16">
                {profile.profile_pic ? (
                  <AvatarImage src={profile.profile_pic} alt={profile.name} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {profile.name[0]?.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <div className="mt-1">
                  {getAccountStatusBadge(profile.account_status)}
                </div>
              </div>
            </div>
            
            {showFullProfile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Joined:</span>
                  <span className="text-sm">{formatDate(profile.date_joined)}</span>
                </div>
                
                {profile.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Country:</span>
                    <span className="text-sm">{profile.country}</span>
                  </div>
                )}
                
                {profile.dob && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Birthday:</span>
                    <span className="text-sm">{formatDate(profile.dob)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Last seen:</span>
                  <span className="text-sm">{formatDate(profile.last_login)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <p className="text-sm">This user has chosen to keep their profile private.</p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleOpenProfile} className="flex-1 gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Profile
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
