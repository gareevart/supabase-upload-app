import type { Metadata } from 'next';
import Playground from '@/app/playground/Playground';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'A cloud IDE for JavaScript, TypeScript, Python and Vite projects.',
};

export default function PlaygroundPage() {
  return <Playground linuxPreviewEnabled={process.env.VERCEL_ENV !== 'production'} />;
}
