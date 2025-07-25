import {
    Card,
    DefinitionList,
    Text,
} from '@gravity-ui/uikit';

interface QuotaSectionProps {
    dailyQuota: string;
}

export const QuotaSection = ({ dailyQuota }: QuotaSectionProps) => {
    return (
        <Card theme="normal" size="l" className="responsive-card">                     
            <div className="subscribe-view">
                <Text variant="subheader-3">AI Image Generation</Text>
                <DefinitionList responsive={true} direction='vertical' className="responsive-definition-list">
                    <DefinitionList.Item name="Daily Limit">
                        <Text>{dailyQuota}</Text>
                    </DefinitionList.Item>
                </DefinitionList>
            </div>
        </Card>
    );
};