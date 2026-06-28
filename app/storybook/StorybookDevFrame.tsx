'use client';

import './StorybookFrame.css';

const STORYBOOK_DEV_URL = 'http://localhost:6006';

export function StorybookDevFrame() {
  return (
    <div className="storybook-frame">
      <p className="storybook-frame__notice">
        Storybook dev server required. Run <code>npm run dev:all</code> or{' '}
        <code>npm run storybook</code> in a separate terminal.
      </p>
      <iframe
        className="storybook-frame__iframe"
        src={STORYBOOK_DEV_URL}
        title="Storybook"
        allow="clipboard-write"
      />
    </div>
  );
}
