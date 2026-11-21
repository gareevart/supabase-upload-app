'use client';

import { Children, isValidElement, type ReactNode } from 'react';
import { Breadcrumbs } from '@gravity-ui/uikit';
import { ActionBar } from '@gravity-ui/navigation';
import type { FavoriteDescriptor } from '@/entities/favorite/model/types';
import { FavoriteToggleButton } from '@/features/favorites/ui/FavoriteToggleButton';
import './PageActionBar.css';

export type PageActionBarItem = {
  label: string;
  href?: string;
};

type PageActionBarProps = {
  ariaLabel: string;
  items?: PageActionBarItem[];
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  favorite?: FavoriteDescriptor;
  maxItems?: number;
  className?: string;
};

export function PageActionBar({
  ariaLabel,
  items = [],
  breadcrumbs,
  actions,
  favorite,
  maxItems = 3,
  className,
}: PageActionBarProps) {
  const actionItems = Children.toArray(actions).filter(isValidElement);
  const hasActions = actionItems.length > 0;

  return (
    <div className={['page-action-bar', className].filter(Boolean).join(' ')}>
      <ActionBar aria-label={ariaLabel}>
        <ActionBar.Section className="page-action-bar__section">
          <ActionBar.Group className="page-action-bar__breadcrumbs-group" stretchContainer>
            <ActionBar.Item className="page-action-bar__breadcrumbs-item">
              {breadcrumbs ?? (
                <Breadcrumbs
                  className={[
                    'page-action-bar__breadcrumbs',
                    favorite ? 'page-action-bar__breadcrumbs_with-favorite' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  maxItems={maxItems}
                >
                  {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const itemKey = `${item.href ?? 'current'}-${item.label}`;

                    if (isLast && favorite) {
                      return (
                        <Breadcrumbs.Item key={itemKey}>
                          <span className="page-action-bar__current-with-favorite">
                            <span className="page-action-bar__current-title">{item.label}</span>
                            <FavoriteToggleButton className="page-action-bar__favorite" {...favorite} />
                          </span>
                        </Breadcrumbs.Item>
                      );
                    }

                    return (
                      <Breadcrumbs.Item key={itemKey} href={item.href}>
                        {item.label}
                      </Breadcrumbs.Item>
                    );
                  })}
                </Breadcrumbs>
              )}
            </ActionBar.Item>
          </ActionBar.Group>
          {hasActions ? (
            <ActionBar.Group className="page-action-bar__actions" pull="right">
              {actionItems.map((action, index) => (
                <ActionBar.Item key={index}>{action}</ActionBar.Item>
              ))}
            </ActionBar.Group>
          ) : null}
        </ActionBar.Section>
      </ActionBar>
    </div>
  );
}
