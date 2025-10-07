"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Text, Icon, Modal, TextInput, TextArea, Checkbox, Card, Spin } from '@gravity-ui/uikit';
import { Plus, Person, ChevronDown, ChevronUp } from '@gravity-ui/icons';
import { BroadcastGroup, Subscriber } from './types';
import { useToast } from '@/hooks/use-toast';

interface GroupSelectorProps {
  selectedGroups: string[];
  onGroupsChange: (groupIds: string[], emails: string[]) => void;
  disabled?: boolean;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  selectedGroups,
  onGroupsChange,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const groupsLoaded = useRef(false);
  const subscribersLoaded = useRef(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState<string | null>(null);
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      // Prevent duplicate requests if already loaded
      if (groupsLoaded.current) return;

      // Check if already loading to prevent concurrent requests
      if (isLoading) return;

      setIsLoading(true);
      const response = await fetch('/api/broadcast-groups', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setGroups(data.data || []);
      groupsLoaded.current = true;
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить группы',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast]);

  const fetchSubscribers = useCallback(async () => {
    try {
      // Prevent duplicate requests if already loaded
      if (subscribersLoaded.current) return;

      const response = await fetch('/api/subscribers?active_only=true', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscribers');
      }

      const data = await response.json();
      setSubscribers(data.data || []);
      subscribersLoaded.current = true;
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
  }, []);

  // Fetch groups and subscribers only once on mount
  useEffect(() => {
    fetchGroups();
    fetchSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGroupToggle = async (groupId: string) => {
    const newSelectedGroups = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];

    // Get emails from selected groups
    const emails = await getEmailsFromGroups(newSelectedGroups);
    onGroupsChange(newSelectedGroups, emails);
  };

  const [groupSubscribersCache, setGroupSubscribersCache] = useState<Record<string, Subscriber[]>>({});

  const getEmailsFromGroups = useCallback(async (groupIds: string[]): Promise<string[]> => {
    if (groupIds.length === 0) return [];

    try {
      const allEmails = new Set<string>();

      for (const groupId of groupIds) {
        const group = groups.find(g => g.id === groupId);
        if (!group) continue;

        if (group.is_default) {
          // For default group, get all active subscribers
          const activeSubscribers = subscribers.filter(s => s.is_active);
          activeSubscribers.forEach(s => allEmails.add(s.email));
        } else {
          // For custom groups, use cached data or fetch once
          let groupSubscribers: Subscriber[] = groupSubscribersCache[groupId];

          if (!groupSubscribers) {
            console.log(`Fetching subscribers for group ${groupId}`);
            const response = await fetch(`/api/subscribers?group_id=${groupId}&active_only=true`, {
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              groupSubscribers = data.data || [];
              setGroupSubscribersCache(prev => ({
                ...prev,
                [groupId]: groupSubscribers
              }));
            }
          }

          groupSubscribers?.forEach((subscriber: Subscriber) => {
            if (subscriber.is_active) {
              allEmails.add(subscriber.email);
            }
          });
        }
      }

      return Array.from(allEmails);
    } catch (error) {
      console.error('Error getting emails from groups:', error);
      return [];
    }
  }, [groups, subscribers, groupSubscribersCache]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название группы',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/broadcast-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          subscriber_ids: selectedSubscribers,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create group API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to create group: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      toast({
        title: 'Успех',
        description: 'Группа создана успешно',
      });

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedSubscribers([]);
      setShowCreateModal(false);

      // Refresh groups and reset loaded flag
      groupsLoaded.current = false;
      await fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать группу',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubscriberToggle = (subscriberId: string) => {
    setSelectedSubscribers(prev =>
      prev.includes(subscriberId)
        ? prev.filter(id => id !== subscriberId)
        : [...prev, subscriberId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spin size="m" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Text variant="body-2">Группы получателей</Text>
        <Button
          view="outlined"
          size="s"
          onClick={() => setShowCreateModal(true)}
          disabled={disabled}
        >
          <Icon data={Plus} size={16} />
          Создать группу
        </Button>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <Card key={group.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={selectedGroups.includes(group.id)}
                  onChange={() => handleGroupToggle(group.id)}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon data={Person} size={16} />
                    <Text variant="body-2" className="font-medium">
                      {group.name}
                    </Text>
                    {group.is_default && (
                      <Text variant="caption-1" color="secondary">
                        (по умолчанию)
                      </Text>
                    )}
                  </div>
                  <Text variant="caption-1" color="secondary">
                    {group.subscriber_count} подписчиков
                  </Text>
                </div>
              </div>
              
              <Button
                view="flat"
                size="s"
                onClick={() => setShowGroupDetails(
                  showGroupDetails === group.id ? null : group.id
                )}
              >
                <Icon 
                  data={showGroupDetails === group.id ? ChevronUp : ChevronDown} 
                  size={16} 
                />
              </Button>
            </div>

            {showGroupDetails === group.id && (
              <div className="mt-3 pt-3 border-t">
                {group.description && (
                  <Text variant="caption-1" color="secondary" className="mb-2">
                    {group.description}
                  </Text>
                )}
                <Text variant="caption-1" color="secondary">
                  Создано: {new Date(group.created_at).toLocaleDateString('ru-RU')}
                </Text>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create Group Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="w-full max-w-2xl p-6">
          <Text variant="subheader-1" className="mb-4">Создать новую группу</Text>
          
          <div className="space-y-4">
            <div>
              <Text variant="body-2" className="mb-1">Название группы</Text>
              <TextInput
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Введите название группы"
                disabled={isCreating}
              />
            </div>

            <div>
              <Text variant="body-2" className="mb-1">Описание (необязательно)</Text>
              <TextArea
                value={newGroupDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewGroupDescription(e.target.value)}
                placeholder="Введите описание группы"
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div>
              <Text variant="body-2" className="mb-2">Выберите подписчиков</Text>
              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {subscribers.length === 0 ? (
                  <Text variant="caption-1" color="secondary">
                    Нет доступных подписчиков
                  </Text>
                ) : (
                  <div className="space-y-2">
                    {subscribers.map((subscriber) => (
                      <div key={subscriber.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSubscribers.includes(subscriber.id)}
                          onChange={() => handleSubscriberToggle(subscriber.id)}
                          disabled={isCreating}
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
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                view="outlined"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Отмена
              </Button>
              <Button
                view="action"
                onClick={handleCreateGroup}
                disabled={isCreating || !newGroupName.trim()}
              >
                {isCreating ? <Spin size="s" /> : 'Создать группу'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupSelector;