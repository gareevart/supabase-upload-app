"use client"

import { useState, useEffect } from 'react';
import { Spin, Text } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import withAuth from '../withAuth';
import { useAuth } from '@/app/contexts/AuthContext';
import '../Auth.css';
import './ProfilePage.css';

import { useClientSideRendering, useUserProfile } from './hooks/useProfile';
import { useSubscription } from './hooks/useSubscription';

import { ProfileView } from './components/ProfileView';
import { SubscriptionsPanel } from '@/features/subscriptions/ui';
import { ApiKeysPanelConnected } from '@/features/api-keys/ui';
import { DangerZoneSection } from './components/DangerZoneSection';

const Profile = () => {
    const { t } = useI18n();
    const { user, signOut } = useAuth();
    const mounted = useClientSideRendering();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Use custom hooks
    const { profile, setProfile, loading, saveProfile } = useUserProfile(user?.id, mounted);
    const { subscription, isSubscriptionLoading, setEmailNewsletterEnabled } = useSubscription(user?.id, user?.email, mounted);

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
        <div className="profile-page">
            <main className="profile-page__main">
                <header className="profile-page__header">
                    <Text as="h1" variant="display-1" className="hub-page__title">
                        {t('favorites.kind.profile')}
                    </Text>
                </header>

                <div className="profile-page__sections profile">
                    <ProfileView
                        profile={profile}
                        user={user}
                        isEditing={isEditing}
                        isSaving={isSaving}
                        setProfile={setProfile}
                        onEdit={() => setIsEditing(true)}
                        onSave={handleSaveProfile}
                        onCancel={() => setIsEditing(false)}
                        onLogout={handleLogout}
                    />

                    <SubscriptionsPanel
                        emailSubscribed={Boolean(subscription?.subscribe_status)}
                        emailLoading={isSubscriptionLoading}
                        onEmailSubscriptionChange={setEmailNewsletterEnabled}
                        fullWidth
                    />

                    <ApiKeysPanelConnected fullWidth />

                    <DangerZoneSection email={user.email} role={profile.role} />
                </div>
            </main>
        </div>
    );
};

export default withAuth(Profile);
