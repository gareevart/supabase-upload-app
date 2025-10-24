"use client";

import React, { useState } from 'react';
import { Modal, Text, TextInput, TextArea, Button, Spin, Checkbox } from '@gravity-ui/uikit';
import type { CreateBroadcastGroupData } from '@/entities/broadcast-group/model';
import type { Subscriber } from '@/entities/subscriber/model';

export interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBroadcastGroupData) => Promise<void>;
  subscribers: Subscriber[];
  isLoading?: boolean;
}

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subscribers,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emails, setEmails] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        subscriber_ids: selectedSubscribers.length > 0 ? selectedSubscribers : undefined,
        emails: emails.trim() ? emails.split(/[,\n\s]+/).map(email => email.trim()).filter(email => email && email.includes('@')) : undefined,
      });

      // Reset form
      setName('');
      setDescription('');
      setEmails('');
      setSelectedSubscribers([]);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setEmails('');
      setSelectedSubscribers([]);
      onClose();
    }
  };

  const toggleSubscriber = (subscriberId: string) => {
    setSelectedSubscribers(prev =>
      prev.includes(subscriberId)
        ? prev.filter(id => id !== subscriberId)
        : [...prev, subscriberId]
    );
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="w-full max-w-2xl">
        <Text variant="subheader-1" className="mb-4">Создать группу</Text>

        <div className="space-y-4">
          <div>
            <Text variant="body-2" className="mb-1">Название группы *</Text>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название группы"
              disabled={isLoading}
            />
          </div>

          <div>
            <Text variant="body-2" className="mb-1">Описание (необязательно)</Text>
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание группы"
              disabled={isLoading}
            />
          </div>

          <div>
            <Text variant="body-2" className="mb-2">Email адреса для добавления в группу</Text>
            <TextArea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Введите email адреса (разделенные запятой, пробелом или новой строкой)&#10;Например:&#10;user1@example.com&#10;user2@example.com, user3@example.com"
              disabled={isLoading}
              rows={4}
            />
            <Text variant="caption-1" color="secondary" className="mt-1">
              Можно вводить несколько email адресов, разделенных запятой, пробелом или новой строкой
            </Text>
          </div>

          {subscribers.length > 0 && (
            <div>
              <Text variant="body-2" className="mb-2">Или выберите из существующих подписчиков</Text>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                <div className="space-y-2">
                  {subscribers.filter(s => s.is_active).map((subscriber) => (
                    <div key={subscriber.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedSubscribers.includes(subscriber.id)}
                        onChange={() => toggleSubscriber(subscriber.id)}
                        disabled={isLoading}
                      />
                      <div>
                        <Text variant="body-2">{subscriber.email}</Text>
                        {subscriber.name && (
                          <Text variant="caption-1" color="secondary">
                            {subscriber.name}
                          </Text>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              view="outlined"
              onClick={handleClose}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              view="action"
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? <Spin size="s" /> : 'Создать'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
