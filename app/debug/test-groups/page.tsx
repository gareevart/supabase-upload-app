"use client";

import React, { useState } from 'react';
import { Button, Text, Modal, TextInput, TextArea, Card, Icon } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';

export default function TestGroupsPage() {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [createdGroups, setCreatedGroups] = useState<Array<{id: string, name: string}>>([]);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      setResults(prev => [...prev, 'Ошибка: Введите название группы']);
      return;
    }

    try {
      setIsSubmitting(true);
      setResults(prev => [...prev, `Создание группы "${newGroupName}"...`]);
      
      // Create the group first
      const response: Response = await fetch('/api/broadcast-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || null,
          subscriber_ids: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add group');
      }

      const groupData: any = await response.json();
      const newGroupId: string = groupData.data.id;
      const createdGroupName: string = groupData.data.name;
      setResults(prev => [...prev, `Группа создана с ID: ${newGroupId}`]);
      
      // Add to created groups list
      setCreatedGroups(prev => [...prev, { id: newGroupId, name: createdGroupName }]);

      // If emails are provided, add them to the group
      if (newGroupEmails.trim()) {
        const emails = newGroupEmails
          .split(/[,\n\s]+/)
          .map(email => email.trim())
          .filter(email => email && email.includes('@'));

        if (emails.length > 0) {
          setResults(prev => [...prev, `Добавление ${emails.length} email адресов в группу...`]);
          
          const addEmailsResponse = await fetch(`/api/broadcast-groups/${newGroupId}/subscribers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ emails }),
          });

          if (!addEmailsResponse.ok) {
            const errorData = await addEmailsResponse.json();
            setResults(prev => [...prev, `Ошибка при добавлении email: ${errorData.error}`]);
          } else {
            const emailResult = await addEmailsResponse.json();
            setResults(prev => [...prev, `Успешно добавлено ${emailResult.added_count} подписчиков`]);
          }
        }
      }

      setResults(prev => [...prev, 'Группа создана успешно!']);

      // Reset form and close modal
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupEmails('');
      setShowAddGroup(false);
    } catch (error) {
      console.error('Error adding group:', error);
      setResults(prev => [...prev, `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Удалить группу "${groupName}"?`)) {
      return;
    }

    try {
      setResults(prev => [...prev, `Удаление группы "${groupName}"...`]);
      
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

      setResults(prev => [...prev, `Группа "${groupName}" успешно удалена`]);
      
      // Remove from created groups list
      setCreatedGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error) {
      console.error('Error deleting group:', error);
      setResults(prev => [...prev, `Ошибка при удалении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`]);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-4">Тестирование создания групп</Text>
      
      <Card className="p-6 mb-4">
        <Text variant="body-1" className="mb-4">
          Эта страница позволяет протестировать создание групп с добавлением email адресов.
        </Text>
        
        <Button
          view="action"
          size="l"
          onClick={() => setShowAddGroup(true)}
        >
          <Icon data={Plus} size={16} />
          Создать тестовую группу
        </Button>
      </Card>

      {createdGroups.length > 0 && (
        <Card className="p-6 mb-4">
          <Text variant="header-2" className="mb-3">Созданные группы:</Text>
          <div className="space-y-2">
            {createdGroups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-2 border rounded">
                <Text variant="body-2">{group.name}</Text>
                <Button
                  view="flat-danger"
                  size="s"
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          <Button
            view="outlined"
            size="s"
            onClick={() => setResults([])}
            className="mt-3"
          >
            Очистить результаты
          </Button>
        </Card>
      )}

      {/* Add Group Modal */}
      <Modal open={showAddGroup} onClose={() => setShowAddGroup(false)}>
        <div className="w-full max-w-2xl p-6">
          <Text variant="subheader-1" className="mb-4">Создать тестовую группу</Text>
          
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
                {isSubmitting ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}