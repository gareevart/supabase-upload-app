"use client"
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button, Card, Text, TextInput} from '@gravity-ui/uikit';
import './MemoryGame.css'; // Add styles for the game

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are not set');
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const emojis = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍉'];

type Card = {
  id: number;
  emoji: string;
  flipped: boolean;
};

const MemoryGame = () => {
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [gameOver, setGameOver] = useState<boolean>(false);

  const startGame = () => {
    const shuffledCards = [...emojis, ...emojis]
        .sort(() => Math.random() - 0.5)
        .map((emoji, index) => ({ id: index, emoji, flipped: false }));
    setCards(shuffledCards);
    setStartTime(Date.now());
    setGameStarted(true);
  };

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || matchedCards.includes(id) || flippedCards.includes(id)) return;

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      const [first, second] = newFlippedCards;
      if (cards[first]?.emoji === cards[second]?.emoji) {
        setMatchedCards((prev) => [...prev, first, second]);
        setFlippedCards([]);
        if (matchedCards.length + 2 === cards.length) {
          setEndTime(Date.now());
          setGameOver(true);
        }
      } else {
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  };

  const [leaderboard, setLeaderboard] = useState<{ name: string; time: number }[]>([]);

  const handleSaveResult = async () => {
    if (!userName) return alert('Please enter your name');
    const timeTaken = (endTime && startTime) ? (endTime - startTime) / 1000 : 0;
    const { error } = await supabase.from('memory_game_results').insert([
      { name: userName, time: timeTaken },
    ]);
    if (error) {
      console.error('Error saving result:', error);
    } else {
      alert('Result saved successfully!');
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('memory_game_results')
        .select('name, time')
        .order('time', { ascending: true })
        .limit(10);
      if (error) {
        console.error('Error fetching leaderboard:', error);
      } else {
        setLeaderboard(data || []);
      }
    };

    fetchLeaderboard();
  };
  };

  return (
    <div className="memory-game">
      {!gameStarted && (
        <Button onClick={startGame} view="action" size="xl">
          Play Game
        </Button>
      )}
      {gameStarted && !gameOver && (
        <Card view="outlined" type="container" size="m" className="cards-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`card ${flippedCards.includes(card.id) || matchedCards.includes(card.id) ? 'flipped' : ''}`}
              onClick={() => handleCardClick(card.id)}
            >
              {flippedCards.includes(card.id) || matchedCards.includes(card.id) ? card.emoji : '❓'}
            </div>
          ))}
        </Card>
      )}
        {gameOver && (
          <div className="game-over">
            <Card size='l'> 
            <Text variant="display-1">Game Over!</Text>
            <Text variant="body-2">Your time: {(endTime && startTime) ? ((endTime - startTime) / 1000) : 0} seconds</Text>
            <div style={{ margin: '10px 0', width: '100%' }}>
              <TextInput 
                placeholder="Your name" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)}
                style={{ width: '100%', marginBottom: '10px' }}
              />
            </div>
            <Button size='l' view='action' onClick={handleSaveResult} style={{ width: '100%' }}>
              Save Result
            </Button>

            {leaderboard.length > 0 && (
              <div className="leaderboard">
                <Text className="leaderboard-title" variant="header-1">Top 10 Results</Text>
                <ul>
                  {leaderboard.map((entry, index) => (
                    <li key={index}>
                      {index + 1}. {entry.name} - {entry.time} seconds
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </Card> 
          </div>
        )}
    </div>
  );
};

export default MemoryGame;
