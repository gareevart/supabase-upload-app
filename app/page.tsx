"use client"

import { Text, Icon, Link } from '@gravity-ui/uikit';
import { Globe } from '@gravity-ui/icons';
import '@/styles/styles.css';
export default function Home() {
  return (
    <div className="page-container">
      <div className="content-container">
        <div className="text-container">
          <Text variant="display-1">
            Dmitrii Gareev is a Product Designer at Yandex Infrastructure. I work at the intersection of product design and AI, helping shape internal tools for developers. My focus is on making complex systems feel simple — designing scalable, intuitive interfaces that adapt to how people actually work.
          </Text>
        </div>
       <div className="links-container">
        <Link href="/" target="_blank" rel="noopener noreferrer" className="link-item">
          <Icon data={Globe} size={16} />X.com</Link>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="link-item">
          <Icon data={Globe} size={16} />
          Telegram
        </Link>
      </div>
      </div>
    </div>
  );
}
