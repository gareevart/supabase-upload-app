'use client';

import type { RefObject } from 'react';
import { ActionBar } from '@gravity-ui/navigation';
import './EditorToolbarActionBar.css';

type EditorToolbarActionBarProps = {
  ariaLabel: string;
  hostRef: RefObject<HTMLDivElement | null>;
  visible?: boolean;
  className?: string;
};

export function EditorToolbarActionBar({
  ariaLabel,
  hostRef,
  visible = false,
  className,
}: EditorToolbarActionBarProps) {
  return (
    <div
      className={[
        'editor-toolbar-action-bar',
        visible ? 'editor-toolbar-action-bar_visible' : 'editor-toolbar-action-bar_hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!visible}
    >
      <ActionBar aria-label={ariaLabel}>
        <ActionBar.Section className="editor-toolbar-action-bar__section">
          <div ref={hostRef} className="editor-toolbar-action-bar__host" />
        </ActionBar.Section>
      </ActionBar>
    </div>
  );
}