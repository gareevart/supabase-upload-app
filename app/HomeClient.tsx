"use client"

import { Text, Icon, Link } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import GradientHoverImage from './components/GradientHoverImage';

export default function HomeClient() {
  return (
    <div className="page-container">
      <div className="content-container">
      <div className="text-container">
        <Text className="home-title" variant="display-1">
          Dmitrii Gareev is a Product Designer at{' '}
          <GradientHoverImage
            src="/infra-logo.svg"
            alt="Infra logo"
            className='infra-logo'
            width={36}
            height={36}
            priority
          />{' '}
          Yandex Infrastructure. I work at the intersection of product design and AI, helping shape internal tools for developers. My focus is on making complex systems feel simple — designing scalable, intuitive interfaces that adapt to how people actually work.
        </Text>

        <div className="links-container">
          <Link href="https://x.com/gareev" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> X.com </Text>
          </Link>
          <Link href="https://t.me/gareev45" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> Telegram </Text>
          </Link>
          <Link href="https://www.linkedin.com/in/dmitrii-gareev-234146253" target="_blank" rel="noopener noreferrer">
            <Text className="LinkHover" variant='subheader-3'><Icon data={Globe} size={16} /> Linkedin </Text>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}