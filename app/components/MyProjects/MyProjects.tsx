'use client';

import '../../components/components.css';
import { Card, Flex, Text } from '@gravity-ui/uikit';
import Link from 'next/link';
import { useId } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';

const MyProjects = ({ showPlayground = false }: { showPlayground?: boolean }) => {
  const { t } = useI18n();
  const playgroundId = useId();

  return (
    <div className="group-container">
      <Link href="/projects/uploader" rel="noopener noreferrer">
        <Card type="container" size="l" className="project-card">
          <Text color="primary" variant="header-1">{t('gallery.projectCardTitle')}</Text>
        </Card>
      </Link>
      <Link href="/chat" rel="noopener noreferrer">
        <Card type="container" size="l" view="filled" theme="info" className="project-card parallax-card">
          <div className="project-card__header">
            <Text color="primary" variant="header-1">AI Chat </Text>
          </div>
        </Card>
      </Link>
      {showPlayground && (
        <Link href="/projects/playground" aria-labelledby={`${playgroundId}-title`} aria-describedby={`${playgroundId}-description`}>
          <Card type="container" size="l" className="project-card">
            <Flex direction="column" gap="1">
              <Text id={`${playgroundId}-title`} color="primary" variant="header-1">{t('playground.title')}</Text>
              <Text id={`${playgroundId}-description`} color="secondary" variant="body-1">
                {t('playground.cardDescription')}
              </Text>
            </Flex>
          </Card>
        </Link>
      )}
    </div>
  );
};

export default MyProjects;
