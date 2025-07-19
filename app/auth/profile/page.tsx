"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    Button,
    Alert,
    Card,
    DefinitionList,
    Spin,
    Text,
    TextArea,
    TextInput,
    useToaster,
    Theme,
    useThemeValue,
} from '@gravity-ui/uikit';
import withAuth from '../withAuth';
import YandexFileUploader from '../components/YandexFileUploader';
import AuthDebugger from '../components/AuthDebugger';
import { useAuth } from '@/app/contexts/AuthContext';
import { ThemeSelector } from '@/app/profile/ThemeSelector';
import '../Auth.css';

interface Profile {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    theme: string | null;
    role: string | null;
    daily_image_quota_remaining?: number;
    quota_last_updated?: string;
}

interface Subscription {
    id?: string;
    subscribe_status: boolean;
    mail: string;
    user_id?: string | null;
    subscribe_started_date?: string | null;
}

const Profile = () => {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [remainingGenerations, setRemainingGenerations] = useState(10);
    const [dailyQuota, setDailyQuota] = useState('10/10 remaining today');
    const currentTheme = useThemeValue();
    const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
    const { add } = useToaster();
    const router = useRouter();

    // Only show UI after first client-side render to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchSubscription = async (userId: string, userEmail: string) => {
        try {
            // First look by user_id
            let { data, error } = await supabase
                .from('subscribe')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // If not found by user_id, look by email
            if (!data && userEmail) {
                const { data: emailData } = await supabase
                    .from('subscribe')
                    .select('*')
                    .eq('mail', userEmail)
                    .maybeSingle();
                data = emailData;
            }

            if (error) throw error;

            if (data) {
                setSubscription(data);
            } else {
                // If no subscription exists, create an object with default values
                setSubscription({
                    mail: userEmail,
                    subscribe_status: false,
                    user_id: userId,
                });
            }
        } catch (err) {
            console.error('Error fetching subscription:', err);
            add({
                name: 'subscription-error',
                title: 'Ошибка',
                content: 'Не удалось получить статус подписки',
                theme: 'danger',
                autoHiding: 5000,
            });
        }
    };

    // Initialize theme from profile when it loads
    useEffect(() => {
        if (profile) {
            setSelectedTheme((profile.theme as Theme) || currentTheme);
        }
    }, [profile, currentTheme]);

    const handleThemeChange = (theme: Theme) => {
        setSelectedTheme(theme);
        setProfile(prev => prev ? { ...prev, theme } : null);

        // Save theme to localStorage
        localStorage.setItem('app-theme', theme);

        // Dispatch a storage event to notify other components
        // Use both the standard storage event and a custom event for same-window communication
        const storageEvent = new StorageEvent('storage', {
            key: 'app-theme',
            newValue: theme,
            oldValue: localStorage.getItem('app-theme'),
            storageArea: localStorage,
            url: window.location.href
        });
        
        window.dispatchEvent(storageEvent);
        
        // Also dispatch a custom event as a fallback
        window.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme }
        }));
    };

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            if (!mounted || !user) return;
            
            try {
                setLoading(true);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profile);

                if (user.email) {
                    await fetchSubscription(user.id, user.email);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        if (mounted) {
            fetchUserAndProfile();
            
            // Fetch quota when user changes
            if (user) {
                const fetchQuota = async () => {
                    try {
                        const { data, error } = await supabase
                            .from('profiles')
                            .select('daily_image_quota_remaining, quota_last_updated')
                            .eq('id', user.id)
                            .single();

                        if (!error && data) {
                            const profile = data as unknown as { daily_image_quota_remaining: number, quota_last_updated: string };
                            const today = new Date().toISOString().split('T')[0];
                            const lastUpdated = new Date(profile.quota_last_updated).toISOString().split('T')[0];

                            if (lastUpdated === today) {
                                setDailyQuota(`${profile.daily_image_quota_remaining}/10 remaining today`);
                                return;
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching quota:', err);
                    }

                    // Fallback to localStorage
                    const quotaData = localStorage.getItem(`yaart_quota_${user.id}`);
                    if (quotaData) {
                        const { lastUpdated, count } = JSON.parse(quotaData);
                        const today = new Date().toISOString().split('T')[0];
                        if (lastUpdated.split('T')[0] === today) {
                            setDailyQuota(`${10 - count}/10 remaining today`);
                            return;
                        }
                    }
                    setDailyQuota('10/10 remaining today');
                };

                fetchQuota();
            }
        }
    }, [mounted, user]);

    const handleSubscriptionToggle = async () => {
        if (!user || !user.email || !subscription) return;

        setIsSubscriptionLoading(true);
        try {
            const newStatus = !subscription.subscribe_status;

            let error: any = null;
            let updatedSubscription = null;

            if (subscription.id) {
                // Update existing subscription
                const { data, error: updateError } = await supabase
                    .from('subscribe')
                    .update({
                        subscribe_status: newStatus,
                        // Always save the date, even when unsubscribing
                        subscribe_started_date:
                            subscription.subscribe_started_date || new Date().toISOString(),
                    })
                    .eq('id', subscription.id)
                    .select()
                    .single();

                error = updateError;
                updatedSubscription = data;
            } else {
                // Create new subscription
                const { data, error: insertError } = await supabase
                    .from('subscribe')
                    .insert([
                        {
                            mail: user.email,
                            user_id: user.id,
                            subscribe_status: newStatus,
                            subscribe_started_date: new Date().toISOString(), // Always set the date
                        },
                    ])
                    .select()
                    .single();

                error = insertError;
                updatedSubscription = data;
            }

            if (error) {
                console.error('Supabase error details:', error);
                throw error;
            }

            if (!updatedSubscription) {
                throw new Error('No data returned from update/insert');
            }

            setSubscription(updatedSubscription);

            add({
                name: 'subscription-success',
                title: 'Успех',
                content: newStatus
                    ? 'Вы успешно подписались на рассылку'
                    : 'Вы успешно отписались от рассылки',
                theme: 'success',
                autoHiding: 5000,
            });
        } catch (err) {
            console.error('Full error updating subscription:', err);
            add({
                name: 'subscription-error',
                title: 'Ошибка',
                content: 'Не удалось обновить статус подписки. Пожалуйста, попробуйте позже.',
                theme: 'danger',
                autoHiding: 10000,
            });
        } finally {
            setIsSubscriptionLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !profile) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: profile.name,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                    bio: profile.bio,
                    website: profile.website,
                    theme: selectedTheme,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Save theme to localStorage
            localStorage.setItem('app-theme', selectedTheme);

            // Dispatch a storage event to notify other components
            const storageEvent = new StorageEvent('storage', {
                key: 'app-theme',
                newValue: selectedTheme,
                oldValue: localStorage.getItem('app-theme'),
                storageArea: localStorage,
                url: window.location.href
            });
            
            window.dispatchEvent(storageEvent);
            
            // Also dispatch a custom event as a fallback
            window.dispatchEvent(new CustomEvent('theme-change', {
                detail: { theme: selectedTheme }
            }));

            add({
                name: 'profile-success',
                title: 'Успех',
                content: 'Профиль успешно обновлен',
                theme: 'success',
                autoHiding: 5000,
            });

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            add({
                name: 'profile-error',
                title: 'Ошибка',
                content: 'Не удалось обновить профиль',
                theme: 'danger',
                autoHiding: 5000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
    };

    // Don't render until client-side to avoid hydration issues
    if (!mounted) {
        return null;
    }

    if (loading || !user || !profile)
        return (
            <div className="login-container">
                <Spin size="l" />
            </div>
        );

    return (
        <div className="profile pb2">
            <Text variant="header-2">Profile</Text>

            {isEditing ? (
                <>
                    <div className="flex-col profile-field w-full">
                        <Text variant="body-2">Name</Text>
                        <TextInput
                            size='l'
                            value={profile.name || ''}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                        />
                    </div>

                    <div className="flex-col profile-field w-full">
                        <Text variant="body-2">Username</Text>
                        <TextInput
                            size='l'
                            value={profile.username || ''}
                            onChange={(e) => setProfile({...profile, username: e.target.value})}
                        />
                    </div>

                        <div className="flex-col profile-field w-full">
                        <Text variant="body-2">Avatar</Text>
                        <YandexFileUploader
                            folderPath="profiles"
                            onUploadComplete={(url: string) => {
                                setProfile({...profile, avatar_url: url});
                            }}
                            existingFileUrl={profile.avatar_url || ''}
                            acceptedFileTypes="image/*"
                            maxSizeMB={2}
                            allowDelete={true}
                            onDeleteComplete={async () => {
                                try {
                                    // Update profile in database to remove avatar_url
                                    if (!user) return;
                                    
                                    const { error: updateError } = await supabase
                                        .from('profiles')
                                        .update({
                                            avatar_url: null
                                        })
                                        .eq('id', user.id);
                                    
                                    if (updateError) {
                                        console.error('Error updating profile:', updateError);
                                        add({
                                            name: 'update-profile-error',
                                            title: 'Ошибка',
                                            content: 'Не удалось обновить профиль: ' + updateError.message,
                                            theme: 'danger',
                                            autoHiding: 5000,
                                        });
                                        return;
                                    }
                                    
                                    // Update local state
                                    setProfile({...profile, avatar_url: null});
                                } catch (err) {
                                    console.error('Unexpected error during avatar deletion:', err);
                                    add({
                                        name: 'delete-avatar-error',
                                        title: 'Ошибка',
                                        content: 'Произошла ошибка при удалении аватара',
                                        theme: 'danger',
                                        autoHiding: 5000,
                                    });
                                }
                            }}
                        />
                        <Text variant="caption-2" color="secondary">
                            Загрузите изображение для аватара (макс. 2MB)
                        </Text>
                    </div>

                    <div className="flex-col profile-field w-full">
                        <Text variant="body-2">Bio</Text>
                        <TextArea
                            size='l'
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        />
                    </div>

                    <div className="flex-col profile-field w-full">
                        <Text variant="body-2">Site</Text>
                        <TextInput
                            size='l'
                            placeholder='https://mamkin-hacker.io'
                            value={profile.website || ''}
                            onChange={(e) => setProfile({...profile, website: e.target.value})}
                        />
                    </div>

                    <div className="flex-col profile-field">
                        <Text variant="body-2" color="primary">Theme</Text>
                        <ThemeSelector
                            value={selectedTheme}
                            onChange={handleThemeChange}
                        />
                    </div>

                    <div className="profile-actions">
                        <Button
                            size="l"
                            view="action"
                            onClick={handleSaveProfile}
                            loading={isSaving}
                        >
                            Save
                        </Button>
                        <Button size="l" view="flat" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Card theme="normal" size="l" className="responsive-card">
                    <div className="profile-view pb2">
                    <Text variant='subheader-3'>User</Text>
                        <div className="flex-col" style={{ width: '100%' }}>
                        {profile.avatar_url && (
                            <img 
                                src={profile.avatar_url} 
                                alt="Avatar" 
                                className="profile-avatar" 
                                style={{ width: '80px', height: '80px' }}
                            />
                        )}
                            <div className="responsive-definition-list">
                                <DefinitionList responsive={true} direction='vertical'>
                                    <DefinitionList.Item name="Email" copyText={user.email}>
                                        {user.email}
                                    </DefinitionList.Item>
                                    <DefinitionList.Item name="Name">
                                        {profile.name || '-'}
                                    </DefinitionList.Item>
                                    <DefinitionList.Item name="Username">
                                        {profile.username || '-'}
                                    </DefinitionList.Item>
                                    <DefinitionList.Item name="Bio">
                                        {profile.bio || '-'}
                                    </DefinitionList.Item>
                                    <DefinitionList.Item name="Role">
                                        {profile.role || '-'}
                                    </DefinitionList.Item>
                                    <DefinitionList.Item name="Site">
                                        {profile.website ? (
                                            <a
                                                href={profile.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {profile.website}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </DefinitionList.Item>
                                </DefinitionList>
                            </div>
                        </div>
                    </div>
                    <div className="profile-actions">
                    <Button size="l" view="action" onClick={() => setIsEditing(true)}>
                        Edit
                    </Button>
                    <Button size="l" view="normal" onClick={handleLogout}>
                        Logout
                    </Button>
                    </div>
                    </Card>
                    <Card theme="normal" size="l" className="responsive-card">
                    <div className="subscribe-view">
                        <Text variant='subheader-3'>Email Newsletter</Text>
                        <DefinitionList responsive={true} direction='vertical' className="responsive-definition-list">
                            <DefinitionList.Item name="Status">
                                {subscription?.subscribe_status ? 'Subscribed' : 'Unsubscribed'}
                            </DefinitionList.Item>
                        </DefinitionList>
                        <Button
                            size="l"
                            view={subscription?.subscribe_status ? 'outlined' : 'normal'}
                            onClick={handleSubscriptionToggle}
                            loading={isSubscriptionLoading}
                        >
                            {subscription?.subscribe_status ? 'Unsubscribe' : 'Subscribe'}
                        </Button>   
                    </div>
                    </Card>
                    <Card theme="normal" size="l" className="responsive-card">                     
                    <div className="subscribe-view">
                        <Text variant="subheader-3">AI Image Generation</Text>
                      
                        {user && (
                            <DefinitionList responsive={true} direction='vertical' className="responsive-definition-list">
                                <DefinitionList.Item name="Daily Limit">
                                    <Text>{dailyQuota}</Text>
                                </DefinitionList.Item>
                            </DefinitionList>
                        )}
                    </div>
                    </Card>
                </>
            )}
            
            {/* Add Auth Debugger for troubleshooting */}
            <AuthDebugger />
        </div>
    );
};

export default withAuth(Profile);
