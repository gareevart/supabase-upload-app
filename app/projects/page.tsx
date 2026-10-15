"use client"
import { Text } from '@gravity-ui/uikit';
import MyProjects from '../components/MyProjects/MyProjects';

export default function ProjectsPage() {
  return (
    <div className="hub-page">
      <main className="hub-page__main">
        <header className="hub-page__header">
          <Text as="h1" variant="display-1">Projects</Text>
        </header>
        <MyProjects />
      </main>
    </div>
  );
}
