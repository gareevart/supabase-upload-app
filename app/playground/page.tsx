import type { Metadata } from 'next';
import Playground from './Playground';

export const metadata: Metadata = {
  title: 'Cloud Playground',
  robots: { index: false, follow: false },
};

export default function PlaygroundPage() {
  return <Playground />;
}
