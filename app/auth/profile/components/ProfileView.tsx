import Image from 'next/image';
import {
    Avatar,
    Button,
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';
import { Profile } from '@/app/auth/profile/types';
import { ThemeToggle } from '@/app/components/Navigation/ThemeToggle';
import { LanguageToggle } from '@/app/components/Navigation/LanguageToggle';
import { NavigationPositionToggle } from '@/app/components/Navigation/NavigationPositionToggle';
import { useI18n } from '@/app/contexts/I18nContext';
import { ProfileEditForm } from './ProfileEditForm';

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
    const { t } = useI18n();

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
                            {profile.avatar_url && (
                                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <Image
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        fill
                                        className="profile-avatar"
                                        style={{ objectFit: 'cover' }}
                                        sizes="80px" />
                                </div>
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
            <Card theme="normal" size="l" className="responsive-card">
                <div className="profile-view pb2">
                    <Text variant='subheader-3'>{t('profile.appearance')}</Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <ThemeToggle />
                    <LanguageToggle />
                    <NavigationPositionToggle />
                </div>
            </Card>
        </>
    );
};
