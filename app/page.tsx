import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import ShowApp from './components/show-app/ShowApp';
import Subscribe from './components/Subscribe/Subscribe';

export const metadata: Metadata = {
  title: 'Dmitrii Gareev, Product designer',
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 max-w-4xl">
    <div className='py-6'>
      <HomeClient />
      <ShowApp />
      <Subscribe />
    </div>
    </main>
  );
}
