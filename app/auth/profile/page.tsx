"use client"

import { useState, useEffect } from 'react';
import { Spin, Text } from '@gravity-ui/uikit';
import withAuth from '../withAuth';
import { useAuth } from '@/app/contexts/AuthContext';
import '../Auth.css';
import { ThemeToggle } from '@/app/components/Navigation/ThemeToggle';

// Import custom hooks
import { useClientSideRendering, useUserProfile } from './hooks/useProfile';
import { useSubscription } from './hooks/useSubscription';
import { useQuotaInfo } from './hooks/useQuota';

// Import components
import { ProfileView } from './components/ProfileView';
import { ProfileEditForm } from './components/ProfileEditForm';
import { SubscriptionSection } from './components/SubscriptionSection';
import { QuotaSection } from './components/QuotaSection';

const Profile = () => {
    const { user, signOut } = useAuth();
    const mounted = useClientSideRendering();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Use custom hooks
    const { profile, setProfile, loading, saveProfile } = useUserProfile(user?.id, mounted);
    const { subscription, isSubscriptionLoading, handleSubscriptionToggle } = useSubscription(user?.id, user?.email, mounted);
    const dailyQuota = useQuotaInfo(user?.id, mounted);

    const handleSaveProfile = async () => {
        if (!user || !profile) return;

        setIsSaving(true);
            
        const success = await saveProfile(user.id, profile, () => {
            setIsEditing(false);
        });
        
        if (!success) {
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
            <ThemeToggle />

            {isEditing ? (
                <ProfileEditForm 
                    profile={profile}
                    setProfile={setProfile}
                    onSave={handleSaveProfile}
                    onCancel={() => setIsEditing(false)}
                    isSaving={isSaving}
                />
            ) : (
                <>
                    <ProfileView 
                        profile={profile}
                        user={user}
                        onEdit={() => setIsEditing(true)}
                        onLogout={handleLogout}
                    />
                    
                    <SubscriptionSection 
                        subscription={subscription}
                        isLoading={isSubscriptionLoading}
                        onToggle={handleSubscriptionToggle}
                    />
                    
                    <QuotaSection dailyQuota={dailyQuota} />
                </>
            )}
        </div>
    );
};

export default withAuth(Profile);
