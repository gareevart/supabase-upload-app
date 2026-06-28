'use client';

import './StorybookFrame.css';

const STORYBOOK_DEV_URL = 'http://localhost:6006';
const STORYBOOK_STATIC_URL = '/storybook/index.html';

export default function StorybookPage() {
  const isDev = process.env.NODE_ENV === 'development';
  const src = isDev ? STORYBOOK_DEV_URL : STORYBOOK_STATIC_URL;

  return (
    <div className="storybook-frame">
      {isDev && (
        <p className="storybook-frame__notice">
          Storybook dev server required. Run <code>npm run dev:all</code> or{' '}
          <code>npm run storybook</code> in a separate terminal.
        </p>
      )}
      <iframe
        className="storybook-frame__iframe"
        src={src}
        title="Storybook"
        allow="clipboard-write"
      />
    </div>
  );
}
