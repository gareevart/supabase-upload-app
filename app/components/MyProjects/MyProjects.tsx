'use client';
import { useEffect, useState } from 'react';
import '../../components/components.css';
import {Button, Card, Text, Skeleton} from '@gravity-ui/uikit';
import Link from 'next/link';

const MyProjects = () => {

  return (
    <div className="content-container">
    <Link href="/projects/uploader" rel="noopener noreferrer">
        <Card type="container" className='file-view-container'>My Gallery</Card>
    </Link>
    <Link href="/yaart" rel="noopener noreferrer">
        <Card type="container" className='file-view-container'>YaART Image Generator</Card>
    </Link>
        <Link href="/chat" rel="noopener noreferrer">
        <Card type="container" className='file-view-container'>AI Chat</Card>
    </Link>
    </div>
  );
}
export default MyProjects;