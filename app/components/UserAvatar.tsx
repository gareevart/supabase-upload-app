"use client";

import { useEffect, useState } from 'react';
import { Avatar, Skeleton } from '@gravity-ui/uikit';
import { FaceAlien } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

interface UserData {
  email: string | null;
  avatar_url: string | null;
}

export default function UserAvatar() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        if (!user) {
          setUserData(null);
          setLoading(false);
          return;
        }
        
        // Get the user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        setUserData({
          email: user.email || null,
          avatar_url: profile?.avatar_url || null
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      fetchUserData();
    }

    // Subscribe to profile changes only if user exists
    let profileSubscription: any = null;
    if (user) {
      profileSubscription = supabase
        .channel('profile_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          () => fetchUserData()
        )
        .subscribe();
    }

    return () => {
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, [user, authLoading]);

  // If still loading, show a skeleton loader
  if (authLoading || loading) {
    return <Skeleton style={{ width: '42px', height: '42px', borderRadius: '50%' }} />;
  }

  // If no user is authenticated, show avatar with alien icon
  if (!user || !userData) {
    return <Avatar icon={FaceAlien} size="l" />;
  }

  // If user has an avatar, show it
  if (userData.avatar_url) {
    return (
      <Avatar 
        imgUrl={userData.avatar_url} 
        fallbackImgUrl="https://loremflickr.com/640/480/cats?lock=3552647338524672" 
        size="l" 
      />
    );
  }

  // If user has no avatar but has an email, show first two letters of email
  if (userData.email) {
    const emailText = userData.email.substring(0, 2).toUpperCase();
    return <Avatar text={emailText} size="l" />;
  }

  // Fallback case (should not happen)
  return <Avatar icon={FaceAlien} size="l" />;
}
