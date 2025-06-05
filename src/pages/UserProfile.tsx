
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarDays, MapPin, UserCheck, Shield, Star } from 'lucide-react';

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

const UserProfile = () => {
  const [searchParams] = useSearchParams();
  const username = searchParams.get('usr');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);
      
      // Fetch user profile by name (treating username as the display name)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('name', username)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setNotFound(true);
        return;
      }

      // Type cast the account_status to ensure type safety
      const typedProfile: UserProfile = {
        ...profileData,
        account_status: profileData.account_status as 'normal' | 'admin' | 'verified'
      };

      setProfile(typedProfile);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load user profile');
      setNotFound(true);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
            <p className="text-gray-500">The user profile you're looking for doesn't exist.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If user has disabled profile visibility, show minimal info
  const showFullProfile = profile.show_profile !== false;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                {profile.profile_pic ? (
                  <AvatarImage src={profile.profile_pic} alt={profile.name} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {profile.name[0]?.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <div className="mt-2">
                  {getAccountStatusBadge(profile.account_status)}
                </div>
              </div>
            </div>
          </CardHeader>
          
          {showFullProfile && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          )}
          
          {!showFullProfile && (
            <CardContent>
              <div className="text-center text-gray-500">
                <p>This user has chosen to keep their profile private.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;
