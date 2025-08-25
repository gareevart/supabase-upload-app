"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Text, Icon, Modal, TextInput, TextArea, Table, TableColumnConfig, Checkbox } from '@gravity-ui/uikit';
import { Plus, TrashBin, Person } from '@gravity-ui/icons';
import { Subscriber } from './types';
import { useToast } from '@/hooks/use-toast';

interface GroupSubscriberManagerProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

const GroupSubscriberManager: React.FC<GroupSubscriberManagerProps> = ({
  groupId,
  groupName,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [allSubscribers, setAllSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmails, setNewEmails] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch group subscribers
  const fetchGroupSubscribers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/broadcast-groups/${groupId}/subscribers`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching group subscribers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Fetch all subscribers
  const fetchAllSubscribers = useCallback(async () => {
    try {
      const response = await fetch('/api/subscribers?active_only=true', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAllSubscribers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching all subscribers:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchGroupSubscribers();
      fetchAllSubscribers();
    }
  }, [isOpen, groupId, fetchGroupSubscribers, fetchAllSubscribers]);

  // Add subscribers by email
  const handleAddByEmail = async () => {
    if (!newEmails.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите email адреса',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Parse emails (split by comma, newline, or space)
      const emails = newEmails
        .split(/[,\n\s]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (emails.length === 0) {
        toast({
          title: 'Ошибка',
          description: 'Не найдено валидных email адресов',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/broadcast-groups/${groupId}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        throw new Error('Failed to add subscribers');
      }

      const result = await response.json();
      
      toast({
        title: 'Успех',
        description: `Добавлено ${result.added_count} подписчиков`,
      });

      setNewEmails('');
      setShowAddModal(false);
      await fetchGroupSubscribers();
    } catch (error) {
      console.error('Error adding subscribers:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить подписчиков',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add existing subscribers
  const handleAddExisting = async () => {
    if (selectedSubscribers.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите подписчиков для добавления',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/broadcast-groups/${groupId}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscriber_ids: selectedSubscribers }),
      });

      if (!response.ok) {
        throw new Error('Failed to add subscribers');
      }

      const result = await response.json();
      
      toast({
        title: 'Успех',
        description: `Добавлено ${result.added_count} подписчиков`,
      });

      setSelectedSubscribers([]);
      setShowAddModal(false);
      await fetchGroupSubscribers();
    } catch (error) {
      console.error('Error adding subscribers:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить подписчиков',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove subscriber from group
  const handleRemoveSubscriber = async (subscriberId: string) => {
    try {
      const response = await fetch(`/api/broadcast-groups/${groupId}/subscribers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscriber_ids: [subscriberId] }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscriber');
      }

      toast({
        title: 'Успех',
        description: 'Подписчик удален из группы',
      });

      await fetchGroupSubscribers();
    } catch (error) {
      console.error('Error removing subscriber:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить подписчика',
        variant: 'destructive',
      });
    }
  };

  // Table columns for group subscribers
  const subscriberColumns: TableColumnConfig<Subscriber>[] = [
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
      id: 'actions',
      name: 'Действия',
      template: (item) => (
        <Button
          view="flat-danger"
          size="s"
          onClick={() => handleRemoveSubscriber(item.id)}
          title="Удалить из группы"
        >
          <Icon data={TrashBin} size={16} />
        </Button>
      ),
      width: 100,
    },
  ];

  // Get subscribers not in current group
  const availableSubscribers = allSubscribers.filter(
    sub => !subscribers.some(groupSub => groupSub.id === sub.id)
  );

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="w-full max-w-4xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text variant="subheader-1">Управление подписчиками</Text>
            <Text variant="body-2" color="secondary">
              Группа: {groupName}
            </Text>
          </div>
          <Button
            view="action"
            onClick={() => setShowAddModal(true)}
          >
            <Icon data={Plus} size={16} />
            Добавить подписчиков
          </Button>
        </div>

        {/* Current subscribers */}
        <div className="mb-6">
          <Text variant="header-2" className="mb-3">
            Подписчики в группе ({subscribers.length})
          </Text>
          
          {subscribers.length === 0 ? (
            <div className="text-center py-8">
              <Text variant="body-1" color="secondary">
                В группе пока нет подписчиков
              </Text>
            </div>
          ) : (
            <Table
              data={subscribers}
              columns={subscriberColumns}
              verticalAlign="top"
            />
          )}
        </div>

        {/* Add subscribers modal */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
          <div className="w-full max-w-2xl p-6">
            <Text variant="subheader-1" className="mb-4">Добавить подписчиков</Text>
            
            <div className="space-y-6">
              {/* Add by email */}
              <div>
                <Text variant="body-2" className="mb-2">Добавить по email адресам</Text>
                <TextInput
                  value={newEmails}
                  onChange={(e) => setNewEmails(e.target.value)}
                  placeholder="Введите email адреса (разделенные запятой, пробелом или новой строкой)"
                  disabled={isSubmitting}            
                />
                <div className="mt-2">
                  <Button
                    view="action"
                    onClick={handleAddByEmail}
                    disabled={isSubmitting || !newEmails.trim()}
                  >
                    Добавить по email
                  </Button>
                </div>
              </div>

              {/* Add existing subscribers */}
              {availableSubscribers.length > 0 && (
                <div>
                  <Text variant="body-2" className="mb-2">
                    Добавить существующих подписчиков ({availableSubscribers.length} доступно)
                  </Text>
                  <div className="max-h-60 overflow-y-auto border rounded p-2">
                    <div className="space-y-2">
                      {availableSubscribers.map((subscriber) => (
                        <div key={subscriber.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedSubscribers.includes(subscriber.id)}
                            onChange={() => {
                              setSelectedSubscribers(prev =>
                                prev.includes(subscriber.id)
                                  ? prev.filter(id => id !== subscriber.id)
                                  : [...prev, subscriber.id]
                              );
                            }}
                            disabled={isSubmitting}
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
                  <div className="mt-2">
                    <Button
                      view="action"
                      onClick={handleAddExisting}
                      disabled={isSubmitting || selectedSubscribers.length === 0}
                    >
                      Добавить выбранных ({selectedSubscribers.length})
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  view="outlined"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

export default GroupSubscriberManager;