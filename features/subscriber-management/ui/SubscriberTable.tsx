"use client";

import React from 'react';
import { Table, TableColumnConfig, Text } from '@gravity-ui/uikit';
import type { Subscriber } from '@/entities/subscriber/model';

export interface SubscriberTableProps {
  subscribers: Subscriber[];
  onEdit?: (subscriber: Subscriber) => void;
  onDelete?: (subscriber: Subscriber) => void;
  onToggleStatus?: (subscriber: Subscriber) => void;
}

export const SubscriberTable: React.FC<SubscriberTableProps> = ({
  subscribers,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const columns: TableColumnConfig<Subscriber>[] = [
    {
      id: 'email',
      name: 'Email',
      template: (item) => (
        <Text variant="body-2" className="font-medium">
          {item.email}
        </Text>
      ),
      width: 300,
    },
    {
      id: 'name',
      name: 'Имя',
      template: (item) => (
        <Text variant="body-2">
          {item.name || '—'}
        </Text>
      ),
      width: 200,
    },
    {
      id: 'status',
      name: 'Статус',
      template: (item) => (
        <Text 
          variant="body-2" 
          color={item.is_active ? 'positive' : 'secondary'}
        >
          {item.is_active ? 'Активен' : 'Неактивен'}
        </Text>
      ),
      width: 120,
    },
    {
      id: 'subscribed_at',
      name: 'Дата подписки',
      template: (item) => (
        <Text variant="body-2">
          {new Date(item.subscribed_at).toLocaleDateString('ru-RU')}
        </Text>
      ),
      width: 150,
    },
  ];

  return (
    <Table
      data={subscribers}
      columns={columns}
      verticalAlign="top"
    />
  );
};
