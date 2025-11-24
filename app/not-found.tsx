"use client"
import React from 'react';
import { Text } from '@gravity-ui/uikit';
import MemoryGame from './components/MemoryGame/MemoryGame';

const NotFoundPage = () => {
  return (
    <div className="page-container min-h-screen px-4 md:px-6">
      <Text variant="display-1">404 - Page Not Found</Text>
      <Text variant="body-2" className="text-center">It seems you{"'"}ve lost your way. Why not play a memory game while you{"'"}re here?</Text>
      <MemoryGame />
    </div>
  );
};

export default NotFoundPage;
