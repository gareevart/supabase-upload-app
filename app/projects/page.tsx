"use client"
import Link from 'next/link';
import { Text } from '@gravity-ui/uikit';
import MyProjects from '../components/MyProjects/MyProjects';

export default function ProjectsPage() {
  return (
    <div className="hub-page">
      <main className="hub-page__main">
        <header className="hub-page__header">
          <Text as="h1" variant="display-1" className="hub-page__title">Projects</Text>
        </header>
        <p><Link href="/playground">Open Cloud Playground</Link></p>
        <MyProjects />
      </main>
    </div>
  );
}
