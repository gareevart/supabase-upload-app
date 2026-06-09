"use client"

import { Text, Icon, Link, Button, Label } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import { useI18n } from './contexts/I18nContext';

export default function HomeClient() {
  const { t } = useI18n();

  return (
    <div className="home-page page-container">
      <section className="home-terminal content-container" aria-labelledby="home-hero-title">
        <div className="home-terminal__prompt" aria-hidden="true">
          <span className="home-terminal__prompt-symbol">❯</span>
          <span>whoami</span>
        </div>

        <div className="home-terminal__content">
          <div className="home-eyebrow">
            <Label theme="info">{t('home.eyebrow')}</Label>
            <span>{t('home.availability')}</span>
          </div>

          <Text id="home-hero-title" className="home-title" variant="display-1">
            {t('home.bio.prefix')}{' '}
            <span className="home-company">{t('home.company.name')}</span>{t('home.bio.suffix')}
          </Text>

          <Text className="home-subtitle" variant="subheader-3" color="secondary">
            {t('home.subtitle')}
          </Text>

          <div className="home-actions" aria-label={t('home.actions.label')}>
            <Button view="action" size="l" href="https://t.me/gareev45" target="_blank">
              {t('home.cta.primary')}
            </Button>
            <Button view="outlined" size="l" href="/projects">
              {t('home.cta.secondary')}
            </Button>
          </div>
        </div>
      </section>

      <div className="links-container home-socials" aria-label={t('home.social.label')}>
        <Link href="https://x.com/gareev" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3"><Icon data={Globe} size={16} /> {t('home.social.x')} </Text>
        </Link>
        <Link href="https://t.me/gareev45" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3"><Icon data={Globe} size={16} /> {t('home.social.telegram')} </Text>
        </Link>
        <Link href="https://www.linkedin.com/in/dmitrii-gareev-234146253" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3"><Icon data={Globe} size={16} /> {t('home.social.linkedin')} </Text>
        </Link>
      </div>
    </div>
  );
}
