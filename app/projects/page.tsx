"use client"
import { Text, Icon, Link } from '@gravity-ui/uikit';
import MyProjects from '../components/MyProjects/MyProjects';
import '../page-styles.css';

export default function Home() {
  return (
    <div className="page-container">
      <main className="page-main">
        <div className="page-header">
          <Text className="page-title" variant="display-1">Projects</Text>
          <MyProjects />
        </div>
      </main>
    </div>
  );
}
