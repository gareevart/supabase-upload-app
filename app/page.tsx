import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import ShowApp from './components/show-app/ShowApp';
import Subscribe from './components/Subscribe/Subscribe';

export const metadata: Metadata = {
  title: 'Dmitrii Gareev, Product designer',
};

export default function Home() {
  return (
    <div>
      <HomeClient />
      <ShowApp />
      <Subscribe />

    </div>
  );
}
