import { Profile } from '@/app/auth/profile/types';
import { ProfileEditForm } from './ProfileEditForm';
import { AppearancePanelConnected } from '@/features/appearance';
import { UserProfileCard } from '@/features/user-profile/ui';

interface ProfileViewProps {
    profile: Profile;
    user: { email?: string | null };
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
    onLogout,
}: ProfileViewProps) => {
    const email = user.email ?? '';

    return (
        <>
            <UserProfileCard
                profile={profile}
                email={email}
                isEditing={isEditing}
                onEdit={onEdit}
                onLogout={onLogout}
                editContent={
                    <ProfileEditForm
                        profile={profile}
                        setProfile={setProfile}
                        onSave={onSave}
                        onCancel={onCancel}
                        isSaving={isSaving}
                    />
                }
            />
            <AppearancePanelConnected fullWidth />
        </>
    );
};