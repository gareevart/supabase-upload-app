"use client";

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Text,
  Card,
  TextInput,
  Modal,
  Icon,
  Skeleton,
  Table,
  TableColumnConfig,
  TableDataItem
} from '@gravity-ui/uikit';
import { Copy, Plus, TrashBin,Key, BookOpen, EyeSlash, Eye} from '@gravity-ui/icons';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: any;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NewApiKey extends ApiKey {
  key?: string; // Полный ключ доступен только при создании
}

interface TableApiKey extends TableDataItem {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
  actions: string;
}

export const ApiKeysManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<NewApiKey | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const { toast } = useToast();

  // Загрузка API ключей
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить API ключи',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Создание нового API ключа
  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название для API ключа',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKeyData(data.apiKey);
      setShowNewKey(true);
      setShowCreateModal(false);
      setNewKeyName('');
      
      // Обновляем список ключей
      await fetchApiKeys();
      
      toast({
        title: 'Успешно',
        description: 'API ключ создан',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать API ключ',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Удаление API ключа
  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить API ключ "${keyName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      await fetchApiKeys();
      toast({
        title: 'Успешно',
        description: 'API ключ удален',
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить API ключ',
        variant: 'destructive',
      });
    }
  };

  // Копирование в буфер обмена
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Скопировано',
        description: 'API ключ скопирован в буфер обмена',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать в буфер обмена',
        variant: 'destructive',
      });
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US');
  };

  // Форматирование относительного времени
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  };

  // Подготовка данных для таблицы
  const tableData: TableApiKey[] = apiKeys.map((apiKey) => ({
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    status: apiKey.is_active ? 'Active' : 'Inactive',
    created_at: formatRelativeTime(apiKey.created_at),
    last_used_at: apiKey.last_used_at ? formatRelativeTime(apiKey.last_used_at) : 'Never',
    actions: apiKey.id, // Используем ID для действий
  }));

  // Конфигурация колонок таблицы
  const columns: TableColumnConfig<TableApiKey>[] = [
    {
      id: 'name',
      name: 'Name',
      width: 150,
      template: (item) => (
        <div className="flex items-center gap-2">
          <Text variant="body-1">{item.name}</Text>
        </div>
      ),
    },
    {
      id: 'key_prefix',
      name: 'Key',
      width: 180,
      template: (item) => (
        <div className="flex items-center gap-2">
          <Text variant="body-1" className="font-mono">
            {item.key_prefix}...
          </Text>
          <Button
            view="flat"
            size="s"
            onClick={() => {
              const apiKey = apiKeys.find(key => key.id === item.id);
              if (apiKey) {
                copyToClipboard(`${apiKey.key_prefix}...`);
              }
            }}
          >
            <Icon data={Copy} size={12} />
          </Button>
        </div>
      ),
    },
    {
      id: 'status',
      name: 'Status',
      width: 100,
      template: (item) => (
        <Text
          variant="body-1"
          color={item.status === 'Active' ? 'positive' : 'secondary'}
        >
          {item.status}
        </Text>
      ),
    },
    {
      id: 'created_at',
      name: 'Create',
      width: 100,
      template: (item) => (
        <div className="flex items-center gap-1">
          <Text variant="body-1" color="secondary">
            {item.created_at}
          </Text>
        </div>
      ),
    },
    {
      id: 'last_used_at',
      name: 'Last used',
      width: 180,
      template: (item) => (
        <div className="flex items-center gap-1">
          <Text variant="body-1" color="secondary">
            {item.last_used_at}
          </Text>
        </div>
      ),
    },
    {
      id: 'actions',
      name: '',
      width: 40,
      template: (item) => {
        const apiKey = apiKeys.find(key => key.id === item.actions);
        return (
          <Button
            view="flat-danger"
            size="s"
            onClick={() => apiKey && deleteApiKey(apiKey.id, apiKey.name)}
          >
            <Icon data={TrashBin} size={14} />
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Card theme="normal" size="l" className='responsive-card'>
        <div className=" grid mt-1">
          <Text variant="subheader-3" color="primary">API Keys</Text>
          <Text variant="body-1" color="secondary" className="mt-1">
            Manage API keys for site access</Text>
        </div>
        <div className='pt-4'>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <Skeleton className="h-8 w-32 mt-4" />
        </div>
      </Card>
    );
  }

  return (
      <>
      <Card theme="normal" size="l" className='responsive-card'>
        <div className="flex justify-between items-start mt-1">
          <div className="grid">
            <Text variant="subheader-3" color="primary">API Keys</Text>
            <Text variant="body-1" color="secondary" className="mt-1">
              Manage API keys for site access</Text>
          </div>
          <Button
            view="outlined"
            size="m"
            onClick={() => window.open('https://github.com/gareevart/supabase-upload-app/blob/main/docs/API_KEYS.md', '_blank')}
          >
            <Icon data={BookOpen} size={16} />
            Docs
          </Button>
        </div>
        <div className='pt-4'>
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center">
              <div className='grid text-center'>
                <Text variant="subheader-1" color="secondary" className="mb-4">
                <Icon data={Key} size={44} className="mx-auto mb-4"/>
                You don&apos;t have any API keys yet
              </Text>
              </div>
              <Button
                view="action"
                size="l"
                onClick={() => setShowCreateModal(true)}
              >
                <Icon data={Plus} size={16} />
                Create key
              </Button>
            </div>
          ) : (
            <>
              <Table
                data={tableData}
                columns={columns}
                verticalAlign="middle"
              />
              <Button
                view="normal"
                size="l"
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                <Icon data={Plus} size={16} />
                Create key
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Модальное окно создания API ключа */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className='p-4'>
          <Text variant="header-2" className="mb-4">Создать API ключ</Text>
          <div className="space-y-4 mt-4">
            <div>
              <Text variant="subheader-1" className="mb-2">Название ключа</Text>
               <Text variant="body-1" color="secondary" className="grid mt-1">
                Выберите понятное название для идентификации ключа
              </Text>
              <TextInput
                size="l"
                placeholder="My magic key"
                value={newKeyName}
                className="mt-1"
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
              />

            </div>

            <div className="mt-4">
            <Alert theme="info" title="API ключ будет показан только один раз после создания" message="Обязательно сохраните его в безопасном месте" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              view="flat"
              size="l"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              onClick={createApiKey}
              loading={creating}
            >
              Создать ключ
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно с новым API ключом */}
      <Modal open={showNewKey} onClose={() => setShowNewKey(false)}>
        <div className="p-6">
          <Text variant="header-2" className="mb-4">API ключ создан</Text>
          <Alert theme="success" title="API ключ успешно создан" message="Скопируйте его сейчас - вы не сможете увидеть его снова!
" />

          {newKeyData && (
            <div className="space-y-4">
              <div>
                <Text variant="subheader-1" className="mb-2">Название </Text>
                <Text variant="body-1">{newKeyData.name}</Text>
              </div>

              <div>
                <Text variant="subheader-1" className="mb-2">API ключ</Text>
                <Text variant="body-1" color="secondary" className='grid mb-2'>
                  Сохраните этот ключ в безопасном месте. После закрытия этого окна
                  вы не сможете увидеть полный ключ снова.
                </Text>
                <div className="flex items-center gap-2 p-3  rounded border">
                  <Text variant="body-2" className="flex-1 font-mono text-sm">
                    {showNewKey ? newKeyData.key : '••••••••••••••••••••••••••••••••'}
                  </Text>
                  <Button
                    view="flat"
                    size="s"
                    onClick={() => setShowNewKey(!showNewKey)}
                  >
                    <Icon data={showNewKey ? EyeSlash : Eye} size={16} />
                  </Button>
                  <Button
                    view="action"
                    size="l"
                    onClick={() => newKeyData.key && copyToClipboard(newKeyData.key)}
                  >
                    <Icon data={Copy} size={16} />
                    Копировать
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              view="outlined"
              size="l"
              onClick={() => {
                setShowNewKey(false);
                setNewKeyData(null);
              }}
            >
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
 </>

  );
};