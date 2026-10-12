"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Icon, Text, List, Link } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { extractHeadings } from '@/shared/lib/blog/headingAnchors';
import './TableOfContents.css';

interface TableOfContentsProps {
  content: unknown;
  className?: string;
  onClose?: () => void;
  onNavigate?: (id: string) => void;
}

const SCROLL_OFFSET = 100;

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  content,
  className = '',
  onClose,
  onNavigate,
}) => {
  const { t } = useI18n();
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const handleScroll = () => {
      let currentId = '';

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= SCROLL_OFFSET) {
          currentId = heading.id;
        }
      }

      setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClick = (id: string) => {
    if (onNavigate) {
      onNavigate(id);
      return;
    }

    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (headings.length === 0) {
    return null;
  }

  const rootClassName = ['table-of-contents', className].filter(Boolean).join(' ');

  return (
    <nav className={rootClassName} aria-label={t('tableOfContents.title')}>
      <div className="table-of-contents__header">
        <Text variant="subheader-3" className="table-of-contents__title">
          {t('tableOfContents.title')}
        </Text>
        {onClose && (
          <Button
            view="flat"
            onClick={onClose}
            aria-label={t('tableOfContents.close')}
          >
            <Icon data={Xmark} size={16} />
          </Button>
        )}
      </div>
      <List
        filterable={false}
        sortable={false}
        virtualized={false}
        items={headings}
        renderItem={(heading) => {
          const isActive = activeId === heading.id;
          const levelClass = Math.min(heading.level, 6);

          return (
            <div
              className={[
                'table-of-contents__item',
                `table-of-contents__item_level-${levelClass}`,
                isActive ? 'table-of-contents__item_active' : '',
              ].filter(Boolean).join(' ')}
            >
              <Link
                href={`#${heading.id}`}
                view={isActive ? 'primary' : 'secondary'}
                className={[
                  'table-of-contents__link',
                  `table-of-contents__link_level-${levelClass}`,
                ].join(' ')}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(heading.id);
                }}
              >
                {heading.text}
              </Link>
            </div>
          );
        }}
      />
    </nav>
  );
};

export default TableOfContents;
