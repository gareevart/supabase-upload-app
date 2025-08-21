'use client';
import '../../components/components.css';
import {Button, Breadcrumbs, Card, Text, Label, Skeleton} from '@gravity-ui/uikit';
import Link from 'next/link';

const MyProjects = () => {

  return (
    <div className="group-container">
    <Link href="/projects/uploader" rel="noopener noreferrer">
        <Card type="container" size="l" className='project-card'>
          <Text color="primary" variant="header-1">Image Syncer</Text>
        </Card>
    </Link>
    <Link href="/yaart" rel="noopener noreferrer">
        <Card type="container" size="l" className='project-card'>
          <Text color="primary" variant="header-1">Image Generator</Text>
        </Card>
    </Link>
        <Link href="/chat" rel="noopener noreferrer">
        <Card type="container" size="l" view="filled" theme="info" className='project-card ai-bg'>
          <div className='flex row gap-2'>
          <Text color="primary" variant="header-1">AI Chat </Text>
          </div>
        </Card>
    </Link>
    </div>
  );
}
export default MyProjects;