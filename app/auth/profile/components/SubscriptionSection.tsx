import {
    Button,
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';
import { Subscription } from '../types';

interface SubscriptionSectionProps {
    subscription: Subscription | null;
    isLoading: boolean;
    onToggle: () => void;
}

export const SubscriptionSection = ({
    subscription,
    isLoading,
    onToggle
}: SubscriptionSectionProps) => {
    return (
        <Card theme="normal" size="l" className="responsive-card">
            <div className="subscribe-view">
                <Text variant='subheader-3'>Email Newsletter</Text>
                <DefinitionList responsive={true} direction='vertical' className="responsive-definition-list">
                    <DefinitionList.Item name="Status">
                        {subscription?.subscribe_status ? 'Subscribed' : 'Not subscribed'}
                    </DefinitionList.Item>
                </DefinitionList>
                <Button
                    size="l"
                    view={subscription?.subscribe_status ? 'outlined' : 'normal'}
                    onClick={onToggle}
                    loading={isLoading}
                >
                    {subscription?.subscribe_status ? 'Unsubscribe' : 'Subscribe'}
                </Button>   
            </div>
        </Card>
    );
};