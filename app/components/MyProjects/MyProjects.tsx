'use client';
import '../../components/components.css';
import {Button, Breadcrumbs, Card, Text, Label, Skeleton} from '@gravity-ui/uikit';
import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const MyProjects = () => {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {}, bgRef);
    return () => ctx.revert();
  }, []);

  // @ts-ignore
  const handleMouseMove = (e: any) => {
    if (!bgRef.current) return;

    const rect = bgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const moveX = (x - centerX) / centerX * 15;
    const moveY = (y - centerY) / centerY * 15;

    gsap.to(bgRef.current, {
      x: moveX,
      y: moveY,
      duration: 0.6,
      ease: "power3.out"
    });
  };

  const handleMouseLeave = () => {
    if (!bgRef.current) return;
    gsap.to(bgRef.current, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "elastic.out(1, 0.5)"
    });
  };

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
        <Card
          type="container"
          size="l"
          view="filled"
          theme="info"
          className='project-card parallax-card'
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div ref={bgRef} className="ai-bg-gsap" />
          <div className='flex row gap-2'>
          <Text color="primary" variant="header-1">AI Chat </Text>
          </div>
        </Card>
    </Link>
    </div>
  );
}
export default MyProjects;