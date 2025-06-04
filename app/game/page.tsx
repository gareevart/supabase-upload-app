"use client"
import React from 'react';
import { Text } from '@gravity-ui/uikit';
import MemoryGame from '../components/MemoryGame/MemoryGame';

const Game = () => {
  return (
    <div className="page-container">
      <Text variant="display-1">Memory game</Text>
      <MemoryGame />
    </div>
  );
};

export default Game;
