import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToaster } from '@gravity-ui/uikit';
import { Profile } from '../types';

export const useClientSideRendering = () => {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    return mounted;
};

export const useUserProfile = (userId: string | undefined, mounted: boolean) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { add } = useToaster();

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!mounted || !userId) return;
            
            try {
                setLoading(true);
                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (error) throw error;
                setProfile(profileData);
            } catch (error) {
                console.error('Error fetching user profile:', error);
                add({
                    name: 'profile-error',
                    title: 'Ошибка',
                    content: 'Не удалось загрузить профиль',
                    theme: 'danger',
                    autoHiding: 5000,
                });
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, userId]);

    const saveProfile = async (userId: string, profileData: Profile, onSuccess: () => void) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: profileData.name,
                    username: profileData.username,
                    avatar_url: profileData.avatar_url,
                    bio: profileData.bio,
                    website: profileData.website,
                    theme: profileData.theme,
                })
                .eq('id', userId);

            if (error) throw error;

            add({
                name: 'profile-success',
                title: 'Успех',
                content: 'Профиль успешно обновлен',
                theme: 'success',
                autoHiding: 5000,
            });

            onSuccess();
        } catch (error) {
            console.error('Error updating profile:', error);
            add({
                name: 'profile-error',
                title: 'Ошибка',
                content: 'Не удалось обновить профиль',
                theme: 'danger',
                autoHiding: 5000,
            });
            return false;
        }
        
        return true;
    };

    return { profile, setProfile, loading, saveProfile };
};