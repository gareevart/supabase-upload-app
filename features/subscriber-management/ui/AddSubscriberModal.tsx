"use client";

import React, { useState } from 'react';
import { Modal, Text, TextInput, Button, Spin } from '@gravity-ui/uikit';
import type { CreateSubscriberData } from '@/entities/subscriber/model';

export interface AddSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubscriberData) => Promise<void>;
  isLoading?: boolean;
}

export const AddSubscriberModal: React.FC<AddSubscriberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      return;
    }

    try {
      await onSubmit({
        email: email.trim(),
        name: name.trim() || undefined,
      });
      
      // Reset form
      setEmail('');
      setName('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setName('');
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="w-full max-w-md p-6">
        <Text variant="subheader-1" className="mb-4">Добавить подписчика</Text>
        
        <div className="space-y-4">
          <div>
            <Text variant="body-2" className="mb-1">Email адрес *</Text>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              disabled={isLoading}
              type="email"
            />
          </div>

          <div>
            <Text variant="body-2" className="mb-1">Имя (необязательно)</Text>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя подписчика"
              disabled={isLoading}
            />
          </div>

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
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? <Spin size="s" /> : 'Добавить'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
