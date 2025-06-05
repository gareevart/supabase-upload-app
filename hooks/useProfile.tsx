import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/contexts/AuthContext";
import { Theme } from "@gravity-ui/uikit";

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  theme: string;
};

type ProfileUpdate = {
  name?: string;
  username?: string;
  bio?: string;
  website?: string;
  theme?: Theme;
  avatar_url?: string | null;
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, username, avatar_url, bio, website, theme")
          .eq("id", user.id)
          .single();
        
        if (error) throw error;
        
        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err instanceof Error ? err : new Error("Error fetching profile"));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);
  
  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) throw new Error("User not authenticated");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      
      if (error) throw error;
      
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      
      return { success: true };
    } catch (err) {
      console.error("Error updating profile:", err);
      return { success: false, error: err };
    }
  };
  
  return {
    profile,
    isLoading,
    error,
    updateProfile,
  };
};