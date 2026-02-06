"use client";

import { useEffect, useMemo, useState } from 'react';
import { Avatar, Skeleton } from '@gravity-ui/uikit';
import { EyesLookRight, EyesLookLeft } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export default function UserAvatar() {
  const { user, loading: authLoading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<typeof EyesLookRight | typeof EyesLookLeft>(EyesLookRight);
  const emailText = useMemo(() => {
    if (!user?.email) return null;
    return user.email.substring(0, 2).toUpperCase();
  }, [user?.email]);

  useEffect(() => {
    let isActive = true;
    async function fetchUserData() {
      try {
        setLoading(true);
        if (!user) {
          if (isActive) {
            setAvatarUrl(null);
            setLoading(false);
          }
          return;
        }
        
        // Get the user's profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (isActive) {
          setAvatarUrl(profile?.avatar_url || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (isActive) {
          setAvatarUrl(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }
    
    if (!authLoading) fetchUserData();

    // Subscribe to profile changes only if user exists
    let profileSubscription: any = null;
    if (user) {
      profileSubscription = supabase
        .channel(`profile_changes_${user.id}`)
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
      isActive = false;
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, [user, authLoading]);

  // Animation effect for unauthenticated users - toggle between EyesLookLeft and EyesLookRight every 5 seconds
  useEffect(() => {
    // Only run the animation for unauthenticated users
    if (user || loading || authLoading) return;
    
    const intervalId = setInterval(() => {
      setCurrentIcon((prevIcon: typeof EyesLookRight | typeof EyesLookLeft) =>
        prevIcon === EyesLookRight ? EyesLookLeft : EyesLookRight
      );
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [user, loading, authLoading]);

  // If still loading, show a skeleton loader
  if (authLoading || loading) {
    return <Skeleton style={{ width: '42px', height: '42px', borderRadius: '50%' }} />;
  }

  // If no user is authenticated, show avatar with animated icon
  if (!user) {
    return <Avatar icon={currentIcon} size="l" />;
  }

  // If user has an avatar, show it
  if (avatarUrl) {
    return (
      <Avatar 
        imgUrl={avatarUrl} 
        fallbackImgUrl="https://loremflickr.com/640/480/cats?lock=3552647338524672" 
        size="l" 
      />
    );
  }

  // If user has no avatar but has an email, show first two letters of email
  if (emailText) {
    return <Avatar text={emailText} size="l" />;
  }

  // Fallback case (should not happen)
  return <Avatar icon={EyesLookLeft} size="l" />;
}
