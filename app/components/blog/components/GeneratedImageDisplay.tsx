"use client";

import React from 'react';
import Image from 'next/image';
import { Button, Text, Card, Icon } from '@gravity-ui/uikit';
import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import '@/app/components/components.css';

interface GeneratedImageDisplayProps {
  prompt: string;
  imageUrl: string;
}

const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({
  prompt,
  imageUrl
}) => {
  const handleTryPrompt = () => {
    const encodedPrompt = encodeURIComponent(prompt);
    window.open(`/yaart?prompt=${encodedPrompt}`, '_blank');
  };

  return (
    <Card size="l" className="ai-image-card">
          <Image 
            src={imageUrl} 
            alt={`Generated from prompt: ${prompt}`}
            width={500}
            height={300}
            style={{ width: '100%', height: 'auto' }}
          />
        <div className="flex flex-col">
          <Text variant="body-2" color="secondary" style={{ marginBottom: '8px' }}>
            AI Generated Image Prompt
          </Text>
          <Text variant="body-1" style={{ marginBottom: '12px' }}>
            {prompt}
          </Text>
          <Button
            view="action"
            size="m"
            onClick={handleTryPrompt}
          >
            Try this prompt
            <Icon data={ArrowUpRightFromSquare} size={16} />
          </Button>
        </div>
    </Card>
  );
};

export default GeneratedImageDisplay;
