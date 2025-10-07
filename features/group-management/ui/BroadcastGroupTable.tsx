"use client";

import React from 'react';
import { Table, TableColumnConfig, Text, Button, Icon } from '@gravity-ui/uikit';
import { Person, Gear, TrashBin } from '@gravity-ui/icons';
import type { BroadcastGroup } from '@/entities/broadcast-group/model';

export interface BroadcastGroupTableProps {
  groups: BroadcastGroup[];
  onManage?: (group: BroadcastGroup) => void;
  onDelete?: (group: BroadcastGroup) => void;
}

export const BroadcastGroupTable: React.FC<BroadcastGroupTableProps> = ({
  groups,
  onManage,
  onDelete,
}) => {
  const columns: TableColumnConfig<BroadcastGroup>[] = [
    {
      id: 'name',
      name: 'Название',
      template: (item) => (
        <div className="flex items-center gap-2">
          <Icon data={Person} size={16} />
          <Text variant="body-2" className="font-medium">
            {item.name}
          </Text>
          {item.is_default && (
            <Text variant="caption-1" color="secondary">
              (по умолчанию)
            </Text>
          )}
        </div>
      ),
      width: 300,
    },
    {
      id: 'description',
      name: 'Описание',
      template: (item) => (
        <Text variant="body-2">
          {item.description || '—'}
        </Text>
      ),
      width: 300,
    },
    {
      id: 'subscriber_count',
      name: 'Подписчиков',
      template: (item) => (
        <Text variant="body-2">
          {item.subscriber_count || 0}
        </Text>
      ),
      width: 120,
    },
    {
      id: 'created_at',
      name: 'Создано',
      template: (item) => (
        <Text variant="body-2">
          {new Date(item.created_at).toLocaleDateString('ru-RU')}
        </Text>
      ),
      width: 150,
    },
    {
      id: 'actions',
      name: 'Действия',
      template: (item) => (
        <div className="flex gap-2">
          <Button
            view="outlined"
            size="s"
            onClick={() => onManage?.(item)}
            title="Управление подписчиками"
          >
            <Icon data={Gear} size={16} />
          </Button>
          {!item.is_default && (
            <Button
              view="flat-danger"
              size="s"
              onClick={() => onDelete?.(item)}
              title="Удалить группу"
            >
              <Icon data={TrashBin} size={16} />
            </Button>
          )}
        </div>
      ),
      width: 150,
    },
  ];

  return (
    <Table
      data={groups}
      columns={columns}
      verticalAlign="top"
    />
  );
};
