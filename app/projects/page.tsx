"use client"
import Link from 'next/link';
import { Card, Text } from '@gravity-ui/uikit';
import MyProjects from '../components/MyProjects/MyProjects';

export default function ProjectsPage() {
  return (
    <div className="hub-page">
      <main className="hub-page__main">
        <header className="hub-page__header">
          <Text as="h1" variant="display-1" className="hub-page__title">Projects</Text>
        </header>
        <section aria-label="Interactive projects">
          <Link href="/projects/playground" style={{ display: 'block', color: 'inherit', textDecoration: 'none', marginBottom: 16 }}>
            <Card view="outlined" type="action" style={{ display: 'grid', gap: 6, padding: '16px 20px' }}>
              <Text as="span" variant="caption-2" color="secondary">INTERACTIVE PROJECT</Text>
              <Text as="h2" variant="header-1">Playground ↗</Text>
              <Text as="p" color="secondary">A cloud IDE for JavaScript, TypeScript, Python and Vite projects.</Text>
            </Card>
          </Link>
        </section>
        <MyProjects />
      </main>
    </div>
  );
}
