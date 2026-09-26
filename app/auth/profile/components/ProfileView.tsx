import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
    Avatar,
    Button,
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';
import { Profile } from '@/app/auth/profile/types';
import { ProfileEditForm } from './ProfileEditForm';
import { AppearancePanelConnected } from '@/features/appearance';
import { getBlobPreviewUrl } from '@/lib/blobUrl';

interface ProfileViewProps {
    profile: Profile;
    user: any;
    isEditing: boolean;
    isSaving: boolean;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onLogout: () => void;
}

export const ProfileView = ({
    profile,
    user,
    isEditing,
    isSaving,
    setProfile,
    onEdit,
    onSave,
    onCancel,
    onLogout
}: ProfileViewProps) => {
    const avatarUrl = getBlobPreviewUrl(profile.avatar_url);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [avatarUrl]);

    const avatarLabel = profile.name || profile.username || user.email || 'User';
    const avatarInitials = avatarLabel
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return (
        <>
            <Card theme="normal" size="l" className="responsive-card">
                <div className="profile-view pb2">
                    <Text variant='subheader-3'>User</Text>
                    {isEditing ? (
                        <div className="flex-col pt-4" style={{ width: '100%', gap: '16px' }}>
                            <ProfileEditForm
                                profile={profile}
                                setProfile={setProfile}
                                onSave={onSave}
                                onCancel={onCancel}
                                isSaving={isSaving}
                            />
                        </div>
                    ) : (
                        <div className="flex-col" style={{ width: '100%' }}>
                            {avatarUrl && !avatarLoadFailed ? (
                                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <Image
                                        src={avatarUrl}
                                        alt={`${avatarLabel} avatar`}
                                        fill
                                        unoptimized
                                        className="profile-avatar"
                                        style={{ objectFit: 'cover' }}
                                        sizes="80px"
                                        onError={() => setAvatarLoadFailed(true)}
                                    />
                                </div>
                            ) : (
                                <Avatar
                                    size="xl"
                                    text={avatarInitials}
                                    aria-label={`${avatarLabel} avatar`}
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
                    )}
                </div>
                {!isEditing && (
                    <div className="profile-actions">
                        <Button size="l" view="action" onClick={onEdit}>
                            Edit
                        </Button>
                        <Button size="l" view="normal" onClick={onLogout}>
                            Logout
                        </Button>
                    </div>
                )}
            </Card>
            <AppearancePanelConnected fullWidth />
        </>
    );
};
