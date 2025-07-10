"use client"

import {
    Button,
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';
import '../auth/Auth.css';

const TestProfile = () => {
    const mockProfile = {
        name: 'Тестовый Пользователь',
        username: 'testuser',
        avatar_url: null,
        bio: 'Это длинное описание пользователя, которое должно корректно переноситься на мобильных устройствах и не вызывать горизонтальный скролл.',
        website: 'https://very-long-website-url-that-should-break-properly.example.com',
        role: 'Developer',
    };

    const mockUser = {
        email: 'very-long-email-address-for-testing@example-domain.com'
    };

    const mockSubscription = {
        subscribe_status: true
    };

    return (
        <div className="profile pb2">
            <Text variant="header-2">Test Profile (Mobile Responsive)</Text>

            <Card theme="normal" size="l" className="responsive-card">
                <div className="profile-view pb2">
                    <Text variant='subheader-3'>Basic Information</Text>
                    <div className="flex-col" style={{ width: '100%' }}>
                        <div className="responsive-definition-list">
                            <DefinitionList responsive={true} direction='vertical'>
                                <DefinitionList.Item name="Email" copyText={mockUser.email}>
                                    {mockUser.email}
                                </DefinitionList.Item>
                                <DefinitionList.Item name="Name">
                                    {mockProfile.name || '-'}
                                </DefinitionList.Item>
                                <DefinitionList.Item name="Username">
                                    {mockProfile.username || '-'}
                                </DefinitionList.Item>
                                <DefinitionList.Item name="Bio">
                                    {mockProfile.bio || '-'}
                                </DefinitionList.Item>
                                <DefinitionList.Item name="Role">
                                    {mockProfile.role || '-'}
                                </DefinitionList.Item>
                                <DefinitionList.Item name="Site">
                                    {mockProfile.website ? (
                                        <a
                                            href={mockProfile.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {mockProfile.website}
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </DefinitionList.Item>
                            </DefinitionList>
                        </div>
                    </div>
                </div>
            </Card>
            
            <div className="subscribe-view pb2">
                <Text variant="body-2">Рассылка</Text>
                <DefinitionList responsive={true} className="responsive-definition-list">
                    <DefinitionList.Item name="Status">
                        {mockSubscription?.subscribe_status ? 'Subscribed' : 'Unsubscribed'}
                    </DefinitionList.Item>
                </DefinitionList>
                <Button
                    size="l"
                    view={mockSubscription?.subscribe_status ? 'outlined' : 'normal'}
                >
                    {mockSubscription?.subscribe_status ? 'Unsubscribe' : 'Subscribe'}
                </Button>
            </div>
            
            <div className="profile-actions">
                <Button size="l" view="action">
                    Edit
                </Button>
                <Button size="l" view="normal">
                    Logout
                </Button>
            </div>
            
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--g-color-base-info-light)', borderRadius: '8px' }}>
                <Text variant="body-2" color="info">
                    <strong>Тест responsive дизайна:</strong><br/>
                    • Длинный email должен переноситься<br/>
                    • Длинный URL должен переноситься<br/>
                    • Кнопки должны помещаться в ширину экрана<br/>
                    • Не должно быть горизонтального скролла
                </Text>
            </div>
        </div>
    );
};

export default TestProfile;
