import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Button,
    Card,
    DefinitionList,
    Spin,
    Text,
    TextArea,
    TextInput,
    useToaster,
} from '@gravity-ui/uikit';
import withAuth from './withAuth';
import FileUploader from './components/FileUploader';
import BucketAccessChecker from './components/BucketAccessChecker';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

interface Profile {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    theme: string | null;
    role: string | null;
}

interface Subscription {
    id?: string;
    subscribe_status: boolean;
    mail: string;
    user_id?: string | null;
    subscribe_started_date?: string | null; // Добавляем это поле
}

const Profile = () => {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
    const {add} = useToaster();
    const navigate = useNavigate();

    const fetchSubscription = async (userId: string, userEmail: string) => {
        try {
            // Сначала ищем по user_id
            let {data, error} = await supabase
                .from('subscribe')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // Если не нашли по user_id, ищем по email
            if (!data && userEmail) {
                const {data: emailData} = await supabase
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
                // Если подписки нет, создаем объект с default значениями
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

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            if (user) {
                const {data: profile} = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profile);

                if (user.email) {
                    await fetchSubscription(user.id, user.email);
                }
            }
        };
        fetchUserAndProfile();
    }, [user]);

    const handleSubscriptionToggle = async () => {
        if (!user || !user.email || !subscription) return;

        setIsSubscriptionLoading(true);
        try {
            const newStatus = !subscription.subscribe_status;

            let error: any = null;
            let updatedSubscription = null;

            if (subscription.id) {
                // Обновляем существующую подписку
                const {data, error: updateError} = await supabase
                    .from('subscribe')
                    .update({
                        subscribe_status: newStatus,
                        // Всегда сохраняем дату, даже при отписке
                        subscribe_started_date:
                            subscription.subscribe_started_date || new Date().toISOString(),
                    })
                    .eq('id', subscription.id)
                    .select()
                    .single();

                error = updateError;
                updatedSubscription = data;
            } else {
                // Создаем новую подписку
                const {data, error: insertError} = await supabase
                    .from('subscribe')
                    .insert([
                        {
                            mail: user.email,
                            user_id: user.id,
                            subscribe_status: newStatus,
                            subscribe_started_date: new Date().toISOString(), // Всегда устанавливаем дату
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
        const {error} = await supabase
            .from('profiles')
            .update({
                name: profile.name,
                username: profile.username,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                website: profile.website,
            })
            .eq('id', user.id);

        setIsSaving(false);
        if (!error) {
            setIsEditing(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        // Контекст авторизации автоматически обработает очистку состояния и перенаправление
    };

    if (!user || !profile)
        return (
            <div>
                <Spin size="l" />
            </div>
        );

    return (
        <div className="profile pb2">
            <Text variant="header-2">Profile</Text>
            
            {/* Add bucket access checker to diagnose storage issues */}
            <div style={{ marginBottom: '20px' }}>
                <BucketAccessChecker bucketName="avatars" />
            </div>

            {isEditing ? (
                <>
                    <div className="profile-field">
                        <Text variant="body-2">Name</Text>
                        <TextInput
                            value={profile.name || ''}
                            onChange={(e) => setProfile({...profile, name: e.target.value})}
                        />
                    </div>

                    <div className="profile-field">
                        <Text variant="body-2">Username</Text>
                        <TextInput
                            value={profile.username || ''}
                            onChange={(e) => setProfile({...profile, username: e.target.value})}
                        />
                    </div>

                    <div className="profile-field">
                        <Text variant="body-2">Avatar</Text>
                        <FileUploader
                            bucketName="avatars"
                            folderPath="profiles"
                            onUploadComplete={(url: string) => setProfile({...profile, avatar_url: url})}
                            existingFileUrl={profile.avatar_url || ''}
                            acceptedFileTypes="image/*"
                            maxSizeMB={2}
                            allowDelete={true}
                        />
                        <Text variant="caption-2" color="secondary">
                            Загрузите изображение для аватара (макс. 2MB)
                        </Text>
                    </div>

                    <div className="profile-field">
                        <Text variant="body-2">Bio:</Text>
                        <TextArea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        />
                    </div>

                    <div className="profile-field">
                        <Text variant="body-2">Site:</Text>
                        <TextInput
                            value={profile.website || ''}
                            onChange={(e) => setProfile({...profile, website: e.target.value})}
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
                    <Card theme="normal" size="l">
                    <div className="profile-view pb2">
                    <Text variant='subheader-3'>Basic Information</Text>
                        {profile.avatar_url && (
                            <img 
                                src={profile.avatar_url} 
                                alt="Avatar" 
                                className="profile-avatar" 
                                style={{ width: '80px', height: '80px' }}
                            />
                        )}
                        <div className="flex-col">
                            <DefinitionList contentMaxWidth={400} responsive={true}>
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
                    </Card>
                    <div className="subscribe-view pb2">
                        <Text variant="body-2">Рассылка</Text>
                        <DefinitionList contentMaxWidth={400} responsive={true}>
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
                    <div className="profile-actions">
                        <Button size="l" view="action" onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                        <Button size="l" view="normal" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default withAuth(Profile);
