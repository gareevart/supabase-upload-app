"use client"

import { Text, Icon, Link } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import GradientHoverImage from './components/GradientHoverImage';
import { useI18n } from './contexts/I18nContext';

export default function HomeClient() {
  const { t } = useI18n();

  return (
    <div className="page-container">
      <div className="content-container">
      <div className="text-container">
        <Text className="home-title" variant="display-1">
          {t('home.bio.prefix')}{' '}
          <GradientHoverImage
            src="/infra-logo.svg"
            alt="Infra logo"
            className='infra-logo'
            width={36}
            height={36}
            priority
          />{' '}
          {t('home.bio.suffix')}
        </Text>

        <div className="links-container">
          <Link href="https://x.com/gareev" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> {t('home.social.x')} </Text>
          </Link>
          <Link href="https://t.me/gareev45" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> {t('home.social.telegram')} </Text>
          </Link>
          <Link href="https://www.linkedin.com/in/dmitrii-gareev-234146253" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> {t('home.social.linkedin')} </Text>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}