import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Dmitrii Gareev, Product designer',
};

export default function Home() {
  return <HomeClient />;
}
