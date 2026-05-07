"use client"

import { Text, Icon, Link, Button, Label } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import GradientHoverImage from './components/GradientHoverImage';
import { useI18n } from './contexts/I18nContext';

const metrics = [
  { value: '10+', labelKey: 'home.metrics.years' },
  { value: 'AI', labelKey: 'home.metrics.ai' },
  { value: 'B2B', labelKey: 'home.metrics.b2b' },
];

const strengths = [
  'home.strengths.strategy',
  'home.strengths.systems',
  'home.strengths.ai',
];

const outcomes = [
  'home.outcomes.discovery',
  'home.outcomes.prototypes',
  'home.outcomes.designSystem',
  'home.outcomes.launch',
];

const proofPoints = [
  'home.proof.infrastructure',
  'home.proof.developers',
  'home.proof.ai',
];

export default function HomeClient() {
  const { t } = useI18n();

  return (
    <div className="home-page page-container">
      <section className="home-hero content-container" aria-labelledby="home-hero-title">
        <div className="home-hero__content">
          <div className="home-eyebrow">
            <Label theme="info">{t('home.eyebrow')}</Label>
            <span>{t('home.availability')}</span>
          </div>

          <Text id="home-hero-title" className="home-title" variant="display-1">
            {t('home.bio.prefix')}{' '}
            <GradientHoverImage
              src="/infra-logo.svg"
              alt="Infra logo"
              className="infra-logo"
              width={36}
              height={36}
              priority
            />{' '}
            {t('home.bio.suffix')}
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

        <aside className="home-hero-card" aria-label={t('home.hero.cardLabel')}>
          <div className="home-hero-card__header">
            <span className="home-hero-card__dot" />
            <Text variant="caption-2" color="secondary">{t('home.hero.cardKicker')}</Text>
          </div>
          <Text variant="header-2">{t('home.hero.cardTitle')}</Text>
          <Text variant="body-2" color="secondary">{t('home.hero.cardText')}</Text>
          <div className="home-metrics">
            {metrics.map((metric) => (
              <div className="home-metric" key={metric.labelKey}>
                <Text variant="header-2">{metric.value}</Text>
                <Text variant="caption-2" color="secondary">{t(metric.labelKey)}</Text>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="home-section content-container" aria-labelledby="home-strengths-title">
        <div className="home-section__header">
          <Text id="home-strengths-title" variant="header-1">{t('home.strengths.title')}</Text>
          <Text variant="body-2" color="secondary">{t('home.strengths.description')}</Text>
        </div>
        <div className="home-card-grid home-card-grid--three">
          {strengths.map((key, index) => (
            <article className="home-card" key={key}>
              <span className="home-card__number">0{index + 1}</span>
              <Text variant="subheader-3">{t(`${key}.title`)}</Text>
              <Text variant="body-2" color="secondary">{t(`${key}.text`)}</Text>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section--highlight content-container" aria-labelledby="home-outcomes-title">
        <div className="home-section__header">
          <Text id="home-outcomes-title" variant="header-1">{t('home.outcomes.title')}</Text>
          <Text variant="body-2" color="secondary">{t('home.outcomes.description')}</Text>
        </div>
        <div className="home-outcomes">
          {outcomes.map((key) => (
            <div className="home-outcome" key={key}>
              <span className="home-outcome__check">✓</span>
              <Text variant="body-2">{t(key)}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section content-container" aria-labelledby="home-proof-title">
        <div className="home-section__header">
          <Text id="home-proof-title" variant="header-1">{t('home.proof.title')}</Text>
          <Text variant="body-2" color="secondary">{t('home.proof.description')}</Text>
        </div>
        <div className="home-card-grid">
          {proofPoints.map((key) => (
            <article className="home-card home-card--proof" key={key}>
              <Text variant="subheader-3">{t(`${key}.title`)}</Text>
              <Text variant="body-2" color="secondary">{t(`${key}.text`)}</Text>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta content-container" aria-labelledby="home-cta-title">
        <div>
          <Text id="home-cta-title" variant="header-1">{t('home.finalCta.title')}</Text>
          <Text variant="body-2" color="secondary">{t('home.finalCta.text')}</Text>
        </div>
        <div className="home-cta__actions">
          <Button view="action" size="l" href="https://t.me/gareev45" target="_blank">
            {t('home.finalCta.button')}
          </Button>
          <Link href="mailto:hello@gareev.dev">
            <Text className="LinkHover" variant="subheader-3">hello@gareev.dev</Text>
          </Link>
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
