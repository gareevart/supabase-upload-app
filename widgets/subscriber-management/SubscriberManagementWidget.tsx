"use client";

import React, { useState } from 'react';
import { Button, Text, Icon, Spin } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';
import { useToast } from '@/hooks/use-toast';
import { useSubscribers } from '@/features/subscriber-management/model/useSubscribers';
import { useBroadcastGroups } from '@/features/group-management/model/useBroadcastGroups';
import { SubscriberTable } from '@/features/subscriber-management/ui/SubscriberTable';
import { AddSubscriberModal } from '@/features/subscriber-management/ui/AddSubscriberModal';
import { BroadcastGroupTable } from '@/features/group-management/ui/BroadcastGroupTable';
import { AddGroupModal } from '@/features/group-management/ui/AddGroupModal';
import { GroupSubscriberManager } from '@/features/group-management/ui/GroupSubscriberManager';
import type { BroadcastGroup } from '@/entities/broadcast-group/model';

export const SubscriberManagementWidget: React.FC = () => {
  const { toast } = useToast();
  
  // State for modals
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BroadcastGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks for data management
  const {
    subscribers,
    isLoading: subscribersLoading,
    error: subscribersError,
    refetch: refetchSubscribers,
    createSubscriber,
  } = useSubscribers();

  const {
    groups,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
    createGroup,
    deleteGroups,
  } = useBroadcastGroups();

  const isLoading = subscribersLoading || groupsLoading;
  const error = subscribersError || groupsError;

  // Handle add subscriber
  const handleAddSubscriber = async (data: { email: string; name?: string }) => {
    try {
      setIsSubmitting(true);
      await createSubscriber(data);
      toast({
        title: 'Успех',
        description: 'Подписчик добавлен успешно',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить подписчика',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add group
  const handleAddGroup = async (data: {
    name: string;
    description?: string;
    subscriber_ids?: string[];
    emails?: string[];
  }) => {
    try {
      setIsSubmitting(true);
      await createGroup(data);
      toast({
        title: 'Успех',
        description: 'Группа создана успешно',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать группу',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete group
  const handleDeleteGroup = async (group: BroadcastGroup) => {
    if (!confirm(`Вы уверены, что хотите удалить группу "${group.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await deleteGroups([group.id]);
      toast({
        title: 'Успех',
        description: 'Группа удалена успешно',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить группу',
        variant: 'destructive',
      });
    }
  };

  // Handle manage group
  const handleManageGroup = (group: BroadcastGroup) => {
    setSelectedGroup(group);
    setShowGroupManager(true);
  };

  // Handle close group manager
  const handleCloseGroupManager = () => {
    setShowGroupManager(false);
    setSelectedGroup(null);
    // Refresh data after managing subscribers
    refetchSubscribers();
    refetchGroups();
  };

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
            onClick={() => {
              refetchSubscribers();
              refetchGroups();
            }}
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
          <BroadcastGroupTable
            groups={groups}
            onManage={handleManageGroup}
            onDelete={handleDeleteGroup}
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
          <SubscriberTable subscribers={subscribers} />
        )}
      </div>

      {/* Modals */}
      <AddSubscriberModal
        isOpen={showAddSubscriber}
        onClose={() => setShowAddSubscriber(false)}
        onSubmit={handleAddSubscriber}
        isLoading={isSubmitting}
      />

      <AddGroupModal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSubmit={handleAddGroup}
        subscribers={subscribers}
        isLoading={isSubmitting}
      />

      {selectedGroup && (
        <GroupSubscriberManager
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          isOpen={showGroupManager}
          onClose={handleCloseGroupManager}
        />
      )}
    </div>
  );
};
