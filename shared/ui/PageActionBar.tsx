'use client';

import { Children, isValidElement, type ReactNode } from 'react';
import { Breadcrumbs } from '@gravity-ui/uikit';
import { ActionBar } from '@gravity-ui/navigation';
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
  maxItems?: number;
  className?: string;
};

export function PageActionBar({
  ariaLabel,
  items = [],
  breadcrumbs,
  actions,
  maxItems = 3,
  className,
}: PageActionBarProps) {
  const actionItems = Children.toArray(actions).filter(isValidElement);

  return (
    <div className={['page-action-bar', className].filter(Boolean).join(' ')}>
      <ActionBar aria-label={ariaLabel}>
        <ActionBar.Section className="page-action-bar__section">
          <ActionBar.Group className="page-action-bar__breadcrumbs-group" stretchContainer>
            <ActionBar.Item className="page-action-bar__breadcrumbs-item">
              {breadcrumbs ?? (
                <Breadcrumbs className="page-action-bar__breadcrumbs" maxItems={maxItems}>
                  {items.map((item) => (
                    <Breadcrumbs.Item key={`${item.href ?? 'current'}-${item.label}`} href={item.href}>
                      {item.label}
                    </Breadcrumbs.Item>
                  ))}
                </Breadcrumbs>
              )}
            </ActionBar.Item>
          </ActionBar.Group>
          {actionItems.length > 0 ? (
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
