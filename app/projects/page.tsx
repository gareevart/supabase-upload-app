"use client"
import { Text } from '@gravity-ui/uikit';
import { useI18n } from '@/app/contexts/I18nContext';
import MyProjects from '../components/MyProjects/MyProjects';

export default function ProjectsPage() {
  const { t } = useI18n();
  return (
    <div className="hub-page">
      <main className="hub-page__main">
        <header className="hub-page__header">
          <Text as="h1" variant="display-1" className="hub-page__title">{t('playground.projects')}</Text>
        </header>
        <MyProjects showPlayground />
      </main>
    </div>
  );
}
