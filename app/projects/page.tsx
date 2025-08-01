"use client"
import { Text, Icon, Link } from '@gravity-ui/uikit';
import MyProjects  from '../components/MyProjects/MyProjects';

export default function Home() {
  return (
    <div className="page-container">
      <div className="content-container">
        <Text variant="display-1">Projects</Text>
            <MyProjects />
      </div>
    </div>
  );
}
