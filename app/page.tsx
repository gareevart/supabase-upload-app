import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import ShowApp from './components/show-app/ShowApp';

export const metadata: Metadata = {
  title: 'Dmitrii Gareev, Product designer',
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 max-w-4xl">
      <div>
        <HomeClient />
        <ShowApp />
      </div>
    </main>
  );
}
