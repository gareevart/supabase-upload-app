"use client";

import React, { useState } from 'react';
import { Button, Text, Card } from '@gravity-ui/uikit';

export default function InitDbPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const initializeDatabase = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      // Step 1: Initialize subscribe table
      const subscribeResponse = await fetch('/api/debug/init-subscribe', {
        method: 'POST',
        credentials: 'include',
      });
      const subscribeResult = await subscribeResponse.text();
      setResults(prev => [...prev, `Subscribe table: ${subscribeResult}`]);

      // Step 2: Initialize broadcast groups system
      const groupsResponse = await fetch('/api/debug/init-groups', {
        method: 'POST',
        credentials: 'include',
      });
      const groupsResult = await groupsResponse.text();
      setResults(prev => [...prev, `Groups system: ${groupsResult}`]);

      setResults(prev => [...prev, 'Database initialization completed!']);
    } catch (error) {
      setResults(prev => [...prev, `Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-4">Инициализация базы данных</Text>
      
      <Card className="p-6 mb-4">
        <Text variant="body-1" className="mb-4">
          Эта страница поможет создать необходимые таблицы для системы рассылок.
        </Text>
        
        <Button
          view="action"
          size="l"
          onClick={initializeDatabase}
          disabled={isLoading}
        >
          {isLoading ? 'Инициализация...' : 'Инициализировать базу данных'}
        </Button>
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <Text variant="header-2" className="mb-3">Результаты:</Text>
          <div className="space-y-2">
            {results.map((result, index) => (
              <Text key={index} variant="body-2" className="font-mono">
                {result}
              </Text>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}