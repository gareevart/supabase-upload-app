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
import { ThemeSelector } from '@/app/profile/ThemeSelector';
import YandexFileUploader from '../../components/YandexFileUploader';
import { Profile } from '../types';

interface ProfileEditFormProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
    selectedTheme: Theme;
    handleThemeChange: (theme: Theme) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export const ProfileEditForm = ({
    profile,
    setProfile,
    selectedTheme,
    handleThemeChange,
    onSave,
    onCancel,
    isSaving
}: ProfileEditFormProps) => {
    const { add } = useToaster();
    const { user } = useAuth();

    return (
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
                    onClick={onSave}
                    loading={isSaving}
                >
                    Save
                </Button>
                <Button size="l" view="flat" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </>
    );
};