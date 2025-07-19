'use client';
import { useEffect, useState } from 'react';
import '../../components/components.css';
import {Button, Breadcrumbs, Card, Text, Label, Skeleton} from '@gravity-ui/uikit';
import Link from 'next/link';

const MyProjects = () => {

  return (
    <div className="content-container">
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
        <Card type="container" size="l" view="filled" theme="utility" className='project-card'>
          <div className='flex row gap-2'>
          <Text color="primary" variant="header-1">AI Chat </Text>
          <Label size="m" theme="utility">Soon</Label>
          </div>
        </Card>
    </Link>
    </div>
  );
}
export default MyProjects;