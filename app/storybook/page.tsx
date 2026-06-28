import { redirect } from 'next/navigation';

import { StorybookDevFrame } from './StorybookDevFrame';

export default function StorybookPage() {
  if (process.env.NODE_ENV === 'development') {
    return <StorybookDevFrame />;
  }

  redirect('/storybook/index.html');
}
