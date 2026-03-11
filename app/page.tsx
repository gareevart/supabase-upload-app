import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import ShowApp from './components/show-app/ShowApp';
import MainPageSection from './components/static-pages/MainPageSection';

export const metadata: Metadata = {
  title: 'Dmitrii Gareev, Product designer',
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 max-w-4xl">
      <div>
        <MainPageSection
          fallback={(
            <>
              <HomeClient />
              <ShowApp />
            </>
          )}
        />
      </div>
    </main>
  );
}
