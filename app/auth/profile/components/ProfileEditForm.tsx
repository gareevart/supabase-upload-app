'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useI18n } from '@/app/contexts/I18nContext';
import { supabase } from '@/lib/supabase';
import {
    Button,
    Text,
    TextArea,
    TextInput,
    useToaster,
} from '@gravity-ui/uikit';
import YandexFileUploader from '../../components/YandexFileUploader';
import { Profile } from '../types';
import './ProfileEditForm.css';

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
    const { t } = useI18n();
    const { add } = useToaster();
    const { user } = useAuth();

    return (
        <div className="profile-edit-form">
            <div className="profile-edit-form__field profile-edit-form__field--avatar">
                <Text variant="body-2">{t('profileEditForm.avatar')}</Text>
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
                                    title: t('profileEditForm.errorTitle'),
                                    content: t('profileEditForm.updateProfileError').replace(
                                        '{message}',
                                        updateError.message
                                    ),
                                    theme: 'danger',
                                    autoHiding: 5000,
                                });
                                return;
                            }

                            setProfile({ ...profile, avatar_url: null });
                        } catch (err) {
                            console.error('Unexpected error during avatar deletion:', err);
                            add({
                                name: 'delete-avatar-error',
                                title: t('profileEditForm.errorTitle'),
                                content: t('profileEditForm.deleteAvatarError'),
                                theme: 'danger',
                                autoHiding: 5000,
                            });
                        }
                    }}
                />
                <Text variant="caption-2" color="secondary">
                    {t('profileEditForm.avatarHint')}
                </Text>
            </div>

            <div className="profile-edit-form__field">
                <Text variant="body-2">{t('userProfileCard.name')}</Text>
                <TextInput
                    size="l"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
            </div>

            <div className="profile-edit-form__field">
                <Text variant="body-2">{t('userProfileCard.username')}</Text>
                <TextInput
                    size="l"
                    value={profile.username || ''}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
            </div>

            <div className="profile-edit-form__field profile-edit-form__field--bio">
                <Text variant="body-2">{t('userProfileCard.bio')}</Text>
                <TextArea
                    size="l"
                    minRows={4}
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
            </div>

            <div className="profile-edit-form__field">
                <Text variant="body-2">{t('userProfileCard.site')}</Text>
                <TextInput
                    size="l"
                    placeholder={t('profileEditForm.sitePlaceholder')}
                    value={profile.website || ''}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                />
            </div>

            <div className="profile-edit-form__actions">
                <Button
                    size="l"
                    view="action"
                    onClick={onSave}
                    loading={isSaving}
                >
                    {t('profileEditForm.save')}
                </Button>
                <Button size="l" view="flat" onClick={onCancel} disabled={isSaving}>
                    {t('profileEditForm.cancel')}
                </Button>
            </div>
        </div>
    );
};