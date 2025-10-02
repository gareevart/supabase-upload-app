"use client"
import { Text, Icon, Link } from '@gravity-ui/uikit';
import MyProjects  from '../components/MyProjects/MyProjects';

export default function Home() {
  return (
    <div className="min-h-screen pt-4">
      <main className="container mx-auto max-w-4xl">
        <div className="flex flex-col justify-between items-start">
        <Text className="mb-6" variant="display-1">Projects</Text>
            <MyProjects />
        </div>    
      </main>
    </div>
  );
}
