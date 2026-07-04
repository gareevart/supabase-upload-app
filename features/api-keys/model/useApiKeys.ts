'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import type { ApiKey, NewApiKey } from './types';

export function useApiKeysFormatters() {
  const { t } = useI18n();

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) {
      return t('apiKeysPanel.date.never');
    }

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }, [t]);

  const formatRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return t('apiKeysPanel.relative.lessThanHour');
    }

    if (diffInHours < 24) {
      if (diffInHours === 1) {
        return t('apiKeysPanel.relative.oneHourAgo');
      }

      return `${diffInHours} ${t('apiKeysPanel.relative.hoursAgo')}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 30) {
      if (diffInDays === 1) {
        return t('apiKeysPanel.relative.oneDayAgo');
      }

      return `${diffInDays} ${t('apiKeysPanel.relative.daysAgo')}`;
    }

    return formatDate(dateString);
  }, [formatDate, t]);

  return { formatDate, formatRelativeTime };
}

export function useApiKeys() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { formatRelativeTime } = useApiKeysFormatters();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<NewApiKey | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [showNewKeyValue, setShowNewKeyValue] = useState(false);

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

        throw new Error(
          resolvedMessage ||
            `Failed to fetch API keys (${response.status} ${response.statusText || 'Unknown status'})`
        );
      }

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      let description = t('apiKeysPanel.toast.loadFailed');
      const isNoSession = error instanceof Error && error.message === 'No active session';

      if (isNoSession) {
        description = t('apiKeysPanel.toast.noSession');
      } else if (error instanceof Error) {
        description = error.message;
      }

      if (!isNoSession) {
        console.error('Error fetching API keys:', error);
      }

      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void fetchApiKeys();
    // toast/t меняют ссылку fetchApiKeys — эффект должен срабатывать только при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description: t('apiKeysPanel.toast.nameRequired'),
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
      setShowNewKeyValue(false);
      setShowNewKey(true);
      setShowCreateModal(false);
      setNewKeyName('');

      await fetchApiKeys();

      toast({
        title: t('apiKeysPanel.toast.successTitle'),
        description: t('apiKeysPanel.toast.created'),
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description: error instanceof Error ? error.message : t('apiKeysPanel.toast.createFailed'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleApiKeyStatus = async (keyId: string, keyName: string, currentStatus: boolean) => {
    const confirmMessage = currentStatus
      ? `${t('apiKeysPanel.confirm.deactivatePrefix')} "${keyName}"?`
      : `${t('apiKeysPanel.confirm.activatePrefix')} "${keyName}"?`;

    if (!confirm(confirmMessage)) {
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
        title: t('apiKeysPanel.toast.successTitle'),
        description: currentStatus
          ? t('apiKeysPanel.toast.deactivated')
          : t('apiKeysPanel.toast.activated'),
      });
    } catch (error) {
      console.error('Error toggling API key status:', error);
      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description: t('apiKeysPanel.toast.toggleFailed'),
        variant: 'destructive',
      });
    }
  };

  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`${t('apiKeysPanel.confirm.deletePrefix')} "${keyName}"?`)) {
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
        title: t('apiKeysPanel.toast.successTitle'),
        description: t('apiKeysPanel.toast.deleted'),
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description: t('apiKeysPanel.toast.deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('apiKeysPanel.toast.copiedTitle'),
        description: t('apiKeysPanel.toast.copied'),
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: t('apiKeysPanel.toast.errorTitle'),
        description: t('apiKeysPanel.toast.copyFailed'),
        variant: 'destructive',
      });
    }
  };

  const closeNewKeyModal = () => {
    setShowNewKey(false);
    setNewKeyData(null);
    setShowNewKeyValue(false);
  };

  return {
    apiKeys,
    loading,
    creating,
    showCreateModal,
    setShowCreateModal,
    newKeyName,
    setNewKeyName,
    newKeyData,
    showNewKey,
    showNewKeyValue,
    setShowNewKeyValue,
    createApiKey,
    toggleApiKeyStatus,
    deleteApiKey,
    copyToClipboard,
    closeNewKeyModal,
    formatRelativeTime,
  };
}
