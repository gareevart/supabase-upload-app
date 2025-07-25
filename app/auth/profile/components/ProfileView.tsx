import {
    Button,
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';
import { Profile } from '@/app/auth/profile/types';

interface ProfileViewProps {
    profile: Profile;
    user: any;
    onEdit: () => void;
    onLogout: () => void;
}

export const ProfileView = ({ profile, user, onEdit, onLogout }: ProfileViewProps) => {
    return (
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
                <Button size="l" view="action" onClick={onEdit}>
                    Edit
                </Button>
                <Button size="l" view="normal" onClick={onLogout}>
                    Logout
                </Button>
            </div>
        </Card>
    );
};