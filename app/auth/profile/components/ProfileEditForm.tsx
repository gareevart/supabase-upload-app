import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Button,
    Text,
    TextArea,
    TextInput,
    Theme,
    useToaster,
} from '@gravity-ui/uikit';
import { useRouter } from 'next/navigation';
import YandexFileUploader from '../../components/YandexFileUploader';
import { Profile } from '../types';

interface ProfileEditFormProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export const ProfileEditForm = ({
    profile,
    setProfile,
    onSave,
    onCancel,
    isSaving
}: ProfileEditFormProps) => {
    const { add } = useToaster();
    const { user } = useAuth();
    const router = useRouter();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className="flex-col profile-field w-full">
                <Text variant="body-2">Name</Text>
                <TextInput
                    size='l'
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
            </div>

            <div className="flex-col profile-field w-full">
                <Text variant="body-2">Username</Text>
                <TextInput
                    size='l'
                    value={profile.username || ''}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
            </div>

            <div className="flex-col profile-field w-full">
                <Text variant="body-2">Avatar</Text>
                <YandexFileUploader
                    folderPath="profiles"
                    onUploadComplete={(url: string) => {
                        setProfile({ ...profile, avatar_url: url });
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
                            setProfile({ ...profile, avatar_url: null });
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
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
            </div>

            <div className="flex-col profile-field w-full">
                <Text variant="body-2">Site</Text>
                <TextInput
                    size='l'
                    placeholder='https://mamkin-hacker.io'
                    value={profile.website || ''}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                />
            </div>

            <Button
                size="l"
                view="normal"
                onClick={() => router.push('/auth/update-password')}
                style={{ alignSelf: 'flex-start' }}
            >
                Update password
            </Button>

            <div className="profile-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button
                    size="l"
                    view="action"
                    onClick={onSave}
                    loading={isSaving}
                >
                    Save
                </Button>
                <Button size="l" view="flat" onClick={onCancel} disabled={isSaving}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
