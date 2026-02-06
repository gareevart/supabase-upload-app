"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Button,
  Text,
  Card,
  TextInput,
  Icon,
  Skeleton,
  Table,
  TableColumnConfig,
  TableDataItem,
  Label,
  DropdownMenu,
  HelpMark,
  Dialog
} from '@gravity-ui/uikit';
import { Copy, Plus, TrashBin, Key, BookOpen, EyeSlash, Eye, CircleStop, CirclePlay, Ellipsis } from '@gravity-ui/icons';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';

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
  const isMobile = useIsMobile();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<NewApiKey | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const { toast } = useToast();

  // Загрузка API ключей
  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await authFetch('/api/api-keys');

      if (!response.ok) {
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        let errorData: Record<string, unknown> = {};

        if (responseText) {
          if (contentType.includes('application/json')) {
            try {
              errorData = JSON.parse(responseText);
              if (!errorData || Object.keys(errorData).length === 0) {
                errorData = { message: 'Empty JSON body', rawResponse: responseText };
              }
            } catch {
              errorData = { rawResponse: responseText };
            }
          } else {
            errorData = { rawResponse: responseText };
          }
        } else {
          errorData = { message: 'Empty response body' };
        }

        const errorMessage =
          typeof errorData === 'object' && errorData !== null
            ? String(
                (errorData as { error?: string; details?: string; message?: string }).error ||
                  (errorData as { details?: string }).details ||
                  (errorData as { message?: string }).message ||
                  ''
              ).trim() || undefined
            : undefined;

        const resolvedMessage =
          response.status === 401 ? 'No active session' : errorMessage;
        if (response.status !== 401) {
          console.error('API error detail:', {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            contentType,
            responseLength: responseText.length,
            error: errorData,
          });
        }
        throw new Error(resolvedMessage || `Failed to fetch API keys (${response.status} ${response.statusText || 'Unknown status'})`);
      }

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      let description = 'Не удалось загрузить API ключи';
      const isNoSession = error instanceof Error && error.message === 'No active session';

      if (isNoSession) {
        description = 'Пожалуйста, войдите в систему';
      } else if (error instanceof Error) {
        description = error.message;
      }

      if (!isNoSession) {
        console.error('Error fetching API keys:', error);
      }

      toast({
        title: 'Ошибка',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await authFetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Create API key failed:', {
          status: response.status,
          statusText: response.statusText,
          error,
        });
        throw new Error(error.error || error.details || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKeyData(data.apiKey);
      setShowNewKey(true);
      setShowCreateModal(false);
      setNewKeyName('');

      await fetchApiKeys();

      toast({
        title: 'Success',
        description: 'API key created',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleApiKeyStatus = async (keyId: string, keyName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} API key "${keyName}"?`)) {
      return;
    }

    try {
      const response = await authFetch('/api/api-keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: keyId,
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle API key status');
      }

      await fetchApiKeys();
      toast({
        title: 'Success',
        description: `API key ${currentStatus ? 'Deactivated' : 'Activated'}`,
      });
    } catch (error) {
      console.error('Error toggling API key status:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle API key status',
        variant: 'destructive',
      });
    }
  };

  // Delete API key
  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить API ключ "${keyName}"?`)) {
      return;
    }

    try {
      const response = await authFetch(`/api/api-keys?id=${keyId}`, {
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
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Format relative time
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

  // Prepare data for table
  const tableData: TableApiKey[] = apiKeys.map((apiKey) => ({
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    status: apiKey.is_active ? 'Active' : 'Inactive',
    created_at: formatRelativeTime(apiKey.created_at),
    last_used_at: apiKey.last_used_at ? formatRelativeTime(apiKey.last_used_at) : 'Never',
    actions: apiKey.id, // Use ID for actions
  }));

  // Table column configuration
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
        </div>
      ),
    },
    {
      id: 'status',
      name: 'Status',
      width: 100,
      template: (item) => (
        <Label
          theme={item.status === 'Active' ? 'success' : 'normal'}
          size="s"
        >
          {item.status}
        </Label>
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
      width: 50,
      sticky: 'end',
      template: (item) => {
        const apiKey = apiKeys.find(key => key.id === item.actions);
        if (!apiKey) return null;

        const menuItems = [
          {
            action: () => toggleApiKeyStatus(apiKey.id, apiKey.name, apiKey.is_active),
            text: apiKey.is_active ? 'Deactivate' : 'Activate',
            iconStart: <Icon data={apiKey.is_active ? CircleStop : CirclePlay} size={16} />,
            theme: 'normal' as const,
          },
          {
            action: () => deleteApiKey(apiKey.id, apiKey.name),
            text: 'Delete',
            iconStart: <Icon data={TrashBin} size={16} />,
            theme: 'danger' as const,
          },
        ];

        return (
          <DropdownMenu
            items={menuItems}
            switcher={
              <Button view="flat" size="s">
                <Icon data={Ellipsis} size={16} />
              </Button>
            }
          />
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

  const createKeyContent = (
    <div className="space-y-4">
      <div>
        <Text variant="subheader-1" className="mb-2">Key name</Text>
        <TextInput
          size="l"
          placeholder="My magic key"
          value={newKeyName}
          className="mt-1"
          onChange={(e) => setNewKeyName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="mt-4">
        <Alert theme="info" title="The API key will be shown only once after creation" message="Be sure to save it in a safe place" />
      </div>
    </div>
  );

  const createKeyFooter = (
    <>
      <Button
        view="outlined"
        size="l"
        onClick={() => setShowCreateModal(false)}
        disabled={creating}
      >
        Cancel
      </Button>
      <Button
        view="action"
        size="l"
        onClick={createApiKey}
        loading={creating}
        disabled={creating}
      >
        Create key
      </Button>
    </>
  );

  const newKeyContent = (
    <>
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
              <Text variant="body-2" className="flex-1 font-mono text-sm break-all">
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
    </>
  );

  const newKeyFooter = (
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
  );

  return (
    <>
      <Card theme="normal" size="l" className='responsive-card'>
        <div className="flex justify-between items-start mt-1">
          <div className="grid">
            <div className='flex items-center gap-1'>
              <Text variant="subheader-3" color="primary">API Keys</Text>
              <HelpMark>
                <Text variant="body-1" color="secondary">
                  Also use these keys for working with MCP
                </Text>
              </HelpMark>
            </div>
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
                  <Icon data={Key} size={44} className="mx-auto mb-4" />
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
      {isMobile ? (
        <DrawerMenu
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create API key"
          footer={createKeyFooter}
        >
          {createKeyContent}
        </DrawerMenu>
      ) : (
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onEnterKeyDown={createApiKey}
          aria-labelledby="create-api-key-dialog-title"
        >
          <Dialog.Header caption="Create API key" id="create-api-key-dialog-title" />
          <Dialog.Body>{createKeyContent}</Dialog.Body>
          <Dialog.Footer
            textButtonApply="Create key"
            textButtonCancel="Cancel"
            onClickButtonCancel={() => setShowCreateModal(false)}
            onClickButtonApply={createApiKey}
            propsButtonApply={{ loading: creating, disabled: creating }}
            propsButtonCancel={{ disabled: creating }}
          />
        </Dialog>
      )}

      {/* Модальное окно с новым API ключом */}
      {isMobile ? (
        <DrawerMenu
          open={showNewKey}
          onClose={() => setShowNewKey(false)}
          title="API ключ создан"
          footer={newKeyFooter}
        >
          {newKeyContent}
        </DrawerMenu>
      ) : (
        <Dialog
          size='m'
          open={showNewKey}
          onClose={() => setShowNewKey(false)}
          aria-labelledby="new-api-key-dialog-title"
        >
          <Dialog.Header caption="API ключ создан" id="new-api-key-dialog-title" />
          <Dialog.Body>{newKeyContent}</Dialog.Body>
          <Dialog.Footer
            textButtonCancel="Закрыть"
            onClickButtonCancel={() => {
              setShowNewKey(false);
              setNewKeyData(null);
            }}
          />
        </Dialog>
      )}
    </>

  );
};