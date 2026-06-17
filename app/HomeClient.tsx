"use client"

import Image from 'next/image';
import { Text, Link } from '@gravity-ui/uikit';
import { useI18n } from './contexts/I18nContext';

export default function HomeClient() {
  const { t } = useI18n();

  return (
    <div className="home-page page-container">
      <section className="home-hero-min content-container" aria-labelledby="home-hero-title">
        <div className="home-brand">
          <span className="home-brand__logo">
            <Image src="/g-logo.svg" alt={t('home.brand.name')} width={36} height={36} priority />
          </span>
          <span className="home-brand__name">{t('home.brand.name')}</span>
        </div>

        <p id="home-hero-title" className="home-bio-lead">{t('home.bio.line')}</p>
        <p className="home-bio-body">{t('home.bio.body')}</p>
      </section>

      <div className="links-container home-socials" aria-label={t('home.social.label')}>
        <Link href="https://x.com/gareev" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3">{t('home.social.x')}</Text>
        </Link>
        <Link href="https://t.me/gareev45" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3">{t('home.social.telegram')}</Text>
        </Link>
        <Link href="https://www.linkedin.com/in/dmitrii-gareev-234146253" target="_blank" rel="noopener noreferrer">
          <Text className="LinkHover" variant="subheader-3">{t('home.social.linkedin')}</Text>
        </Link>
      </div>
    </div>
  );
}
