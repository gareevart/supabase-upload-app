"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Text, Icon, Table, TableColumnConfig, Spin, Modal, TextInput, TextArea, Checkbox } from '@gravity-ui/uikit';
import { Plus, Person, TrashBin, Pencil, Gear } from '@gravity-ui/icons';
import { Subscriber, BroadcastGroup } from '@/app/components/broadcasts/types';
import GroupSubscriberManager from '@/app/components/broadcasts/GroupSubscriberManager';
import { useToast } from '@/hooks/use-toast';
import withBroadcastAuth from '../broadcasts/withBroadcastAuth';
import { supabase } from '@/lib/supabase';

function SubscribersPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Modal states
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BroadcastGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  const [newSubscriberName, setNewSubscriberName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');
  const [selectedSubscribersForGroup, setSelectedSubscribersForGroup] = useState<string[]>([]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        if (!session) {
          toast({
            title: 'Требуется авторизация',
            description: 'Войдите в систему для доступа к управлению подписчиками',
            variant: 'destructive',
          });
          router.push('/auth');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        router.push('/auth');
      }
    };
    
    checkAuth();
  }, [router, toast]);
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch subscribers and groups in parallel
      const [subscribersResponse, groupsResponse] = await Promise.all([
        fetch('/api/subscribers', { credentials: 'include' }),
        fetch('/api/broadcast-groups', { credentials: 'include' })
      ]);

      if (!subscribersResponse.ok || !groupsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [subscribersData, groupsData] = await Promise.all([
        subscribersResponse.json(),
        groupsResponse.json()
      ]);

      setSubscribers(subscribersData.data || []);
      setGroups(groupsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Не удалось загрузить данные');
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch data
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleAddSubscriber = async () => {
    if (!newSubscriberEmail.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите email адрес',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newSubscriberEmail,
          name: newSubscriberName || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add subscriber');
      }

      toast({
        title: 'Успех',
        description: 'Подписчик добавлен успешно',
      });

      // Reset form and close modal
      setNewSubscriberEmail('');
      setNewSubscriberName('');
      setShowAddSubscriber(false);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error adding subscriber:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить подписчика',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название группы',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create the group first
      const response = await fetch('/api/broadcast-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || null,
          subscriber_ids: selectedSubscribersForGroup,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add group');
      }

      const groupData = await response.json();
      const newGroupId = groupData.data.id;

      // If emails are provided, add them to the group
      if (newGroupEmails.trim()) {
        const emails = newGroupEmails
          .split(/[,\n\s]+/)
          .map(email => email.trim())
          .filter(email => email && email.includes('@'));

        if (emails.length > 0) {
          const addEmailsResponse = await fetch(`/api/broadcast-groups/${newGroupId}/subscribers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ emails }),
          });

          if (!addEmailsResponse.ok) {
            console.error('Failed to add emails to group, but group was created');
          }
        }
      }

      toast({
        title: 'Успех',
        description: 'Группа создана успешно',
      });

      // Reset form and close modal
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupEmails('');
      setSelectedSubscribersForGroup([]);
      setShowAddGroup(false);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error adding group:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать группу',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить группу "${groupName}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch('/api/broadcast-groups', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          group_ids: [groupId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete group');
      }

      toast({
        title: 'Успех',
        description: 'Группа удалена успешно',
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить группу',
        variant: 'destructive',
      });
    }
  };

  // Open group manager
  const handleManageGroup = (group: BroadcastGroup) => {
    setSelectedGroup(group);
    setShowGroupManager(true);
  };

  // Table columns for subscribers
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

  // Table columns for groups
  const groupColumns: TableColumnConfig<BroadcastGroup>[] = [
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
            onClick={() => handleManageGroup(item)}
            title="Управление подписчиками"
          >
            <Icon data={Gear} size={16} />
          </Button>
          {!item.is_default && (
            <Button
              view="flat-danger"
              size="s"
              onClick={() => handleDeleteGroup(item.id, item.name)}
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

  if (isAuthenticated === false) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1" className="mb-4">Необходимо войти в систему</Text>
          <Button
            view="action"
            size="l"
            onClick={() => router.push('/auth')}
          >
            Перейти к авторизации
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center py-8">
          <Spin size="m" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1" className="text-red-500 mb-4">{error}</Text>
          <Button
            view="normal"
            size="l"
            onClick={fetchData}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col text-start">
          <Text variant="display-1" className="mb-2">Управление подписчиками</Text>
          <Text variant="body-1" color="secondary">
            Управляйте подписчиками и группами для рассылок
          </Text>
        </div>
        
        <div className="flex gap-3">
          <Button
            view="outlined"
            size="l"
            onClick={() => setShowAddGroup(true)}
          >
            <Icon data={Plus} size={16} />
            Новая группа
          </Button>
          <Button
            view="action"
            size="l"
            onClick={() => setShowAddSubscriber(true)}
          >
            <Icon data={Plus} size={16} />
            Новый подписчик
          </Button>
        </div>
      </div>

      {/* Groups Section */}
      <div className="mb-8">
        <Text variant="header-2" className="mb-4">Группы рассылок</Text>
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Text variant="body-1" className="mb-4">Группы не найдены</Text>
            <Button
              view="action"
              size="l"
              onClick={() => setShowAddGroup(true)}
            >
              Создать первую группу
            </Button>
          </div>
        ) : (
          <Table
            data={groups}
            columns={groupColumns}
            verticalAlign="top"
          />
        )}
      </div>

      {/* Subscribers Section */}
      <div>
        <Text variant="header-2" className="mb-4">Подписчики</Text>
        {subscribers.length === 0 ? (
          <div className="text-center py-8">
            <Text variant="body-1" className="mb-4">Подписчики не найдены</Text>
            <Button
              view="action"
              size="l"
              onClick={() => setShowAddSubscriber(true)}
            >
              Добавить первого подписчика
            </Button>
          </div>
        ) : (
          <Table
            data={subscribers}
            columns={subscriberColumns}
            verticalAlign="top"
          />
        )}
      </div>

      {/* Add Subscriber Modal */}
      <Modal open={showAddSubscriber} onClose={() => setShowAddSubscriber(false)}>
        <div className="w-full max-w-md p-6">
          <Text variant="subheader-1" className="mb-4">Добавить подписчика</Text>
          
          <div className="space-y-4">
            <div>
              <Text variant="body-2" className="mb-1">Email адрес *</Text>
              <TextInput
                value={newSubscriberEmail}
                onChange={(e) => setNewSubscriberEmail(e.target.value)}
                placeholder="example@email.com"
                disabled={isSubmitting}
                type="email"
              />
            </div>

            <div>
              <Text variant="body-2" className="mb-1">Имя (необязательно)</Text>
              <TextInput
                value={newSubscriberName}
                onChange={(e) => setNewSubscriberName(e.target.value)}
                placeholder="Имя подписчика"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                view="outlined"
                onClick={() => setShowAddSubscriber(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                view="action"
                onClick={handleAddSubscriber}
                disabled={isSubmitting || !newSubscriberEmail.trim()}
              >
                {isSubmitting ? <Spin size="s" /> : 'Добавить'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Group Modal */}
      <Modal open={showAddGroup} onClose={() => setShowAddGroup(false)}>
        <div className="w-full max-w-2xl p-6">
          <Text variant="subheader-1" className="mb-4">Создать группу</Text>
          
          <div className="space-y-4">
            <div>
              <Text variant="body-2" className="mb-1">Название группы *</Text>
              <TextInput
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Название группы"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Text variant="body-2" className="mb-1">Описание (необязательно)</Text>
              <TextInput
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Описание группы"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Text variant="body-2" className="mb-2">Email адреса для добавления в группу</Text>
              <TextArea
                value={newGroupEmails}
                onChange={(e) => setNewGroupEmails(e.target.value)}
                placeholder="Введите email адреса (разделенные запятой, пробелом или новой строкой)&#10;Например:&#10;user1@example.com&#10;user2@example.com, user3@example.com"
                disabled={isSubmitting}
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
                          checked={selectedSubscribersForGroup.includes(subscriber.id)}
                          onChange={() => {
                            setSelectedSubscribersForGroup(prev =>
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
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                view="outlined"
                onClick={() => setShowAddGroup(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                view="action"
                onClick={handleAddGroup}
                disabled={isSubmitting || !newGroupName.trim()}
              >
                {isSubmitting ? <Spin size="s" /> : 'Создать'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Group Subscriber Manager */}
      {selectedGroup && (
        <GroupSubscriberManager
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          isOpen={showGroupManager}
          onClose={() => {
            setShowGroupManager(false);
            setSelectedGroup(null);
            // Refresh data after managing subscribers
            fetchData();
          }}
        />
      )}
    </div>
  );
}

export default withBroadcastAuth(SubscribersPage);