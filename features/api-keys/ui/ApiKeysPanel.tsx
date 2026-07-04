'use client';

import {
  Alert,
  Button,
  Dialog,
  DropdownMenu,
  HelpMark,
  Icon,
  Label,
  Skeleton,
  Table,
  type TableColumnConfig,
  type TableDataItem,
  Text,
  TextInput,
} from '@gravity-ui/uikit';
import {
  BookOpen,
  CirclePlay,
  CircleStop,
  Copy,
  Ellipsis,
  Eye,
  EyeSlash,
  Key,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import type { ApiKey, NewApiKey } from '../model/types';
import { useApiKeys, useApiKeysFormatters } from '../model/useApiKeys';
import '@/features/appearance/ui/AppearancePanel.css';
import './ApiKeysPanel.css';

const DOCS_URL = 'https://github.com/gareevart/supabase-upload-app/blob/main/docs/API_KEYS.md';

interface TableApiKey extends TableDataItem {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string;
  actions: string;
}

export type ApiKeysPanelProps = {
  apiKeys: ApiKey[];
  loading?: boolean;
  creating?: boolean;
  showCreateModal?: boolean;
  onShowCreateModalChange?: (open: boolean) => void;
  newKeyName?: string;
  onNewKeyNameChange?: (value: string) => void;
  onCreateKey?: () => void;
  showNewKey?: boolean;
  onCloseNewKey?: () => void;
  newKeyData?: NewApiKey | null;
  showNewKeyValue?: boolean;
  onToggleShowNewKeyValue?: () => void;
  onCopyKey?: (text: string) => void;
  onToggleStatus?: (keyId: string, keyName: string, isActive: boolean) => void;
  onDelete?: (keyId: string, keyName: string) => void;
  formatRelativeTime?: (dateString: string) => string;
  fullWidth?: boolean;
  className?: string;
};

export function ApiKeysPanel({
  apiKeys,
  loading = false,
  creating = false,
  showCreateModal = false,
  onShowCreateModalChange,
  newKeyName = '',
  onNewKeyNameChange,
  onCreateKey,
  showNewKey = false,
  onCloseNewKey,
  newKeyData = null,
  showNewKeyValue = false,
  onToggleShowNewKeyValue,
  onCopyKey,
  onToggleStatus,
  onDelete,
  formatRelativeTime,
  fullWidth = false,
  className,
}: ApiKeysPanelProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { formatRelativeTime: defaultFormatRelativeTime } = useApiKeysFormatters();
  const formatTime = formatRelativeTime ?? defaultFormatRelativeTime;

  const panelClassName = [
    'appearance-panel',
    'api-keys-panel',
    fullWidth ? 'appearance-panel--full-width api-keys-panel--full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tableData: TableApiKey[] = apiKeys.map((apiKey) => ({
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    status: apiKey.is_active
      ? t('apiKeysPanel.status.active')
      : t('apiKeysPanel.status.inactive'),
    created_at: formatTime(apiKey.created_at),
    last_used_at: apiKey.last_used_at
      ? formatTime(apiKey.last_used_at)
      : t('apiKeysPanel.date.never'),
    actions: apiKey.id,
  }));

  const columns: TableColumnConfig<TableApiKey>[] = [
    {
      id: 'name',
      name: t('apiKeysPanel.column.name'),
      width: 150,
      template: (item) => <Text variant="body-1">{item.name}</Text>,
    },
    {
      id: 'key_prefix',
      name: t('apiKeysPanel.column.key'),
      width: 180,
      template: (item) => (
        <Text variant="body-1" className="api-keys-panel__key-prefix">
          {item.key_prefix}...
        </Text>
      ),
    },
    {
      id: 'status',
      name: t('apiKeysPanel.column.status'),
      width: 100,
      template: (item) => (
        <Label
          theme={item.status === t('apiKeysPanel.status.active') ? 'success' : 'normal'}
          size="s"
        >
          {item.status}
        </Label>
      ),
    },
    {
      id: 'created_at',
      name: t('apiKeysPanel.column.created'),
      width: 100,
      template: (item) => (
        <Text variant="body-1" color="secondary">
          {item.created_at}
        </Text>
      ),
    },
    {
      id: 'last_used_at',
      name: t('apiKeysPanel.column.lastUsed'),
      width: 180,
      template: (item) => (
        <Text variant="body-1" color="secondary">
          {item.last_used_at}
        </Text>
      ),
    },
    {
      id: 'actions',
      name: '',
      width: 50,
      sticky: 'end',
      template: (item) => {
        const apiKey = apiKeys.find((key) => key.id === item.actions);
        if (!apiKey || !onToggleStatus || !onDelete) {
          return null;
        }

        const menuItems = [
          {
            action: () => onToggleStatus(apiKey.id, apiKey.name, apiKey.is_active),
            text: apiKey.is_active
              ? t('apiKeysPanel.action.deactivate')
              : t('apiKeysPanel.action.activate'),
            iconStart: <Icon data={apiKey.is_active ? CircleStop : CirclePlay} size={16} />,
            theme: 'normal' as const,
          },
          {
            action: () => onDelete(apiKey.id, apiKey.name),
            text: t('apiKeysPanel.action.delete'),
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

  const createKeyContent = (
    <div className="api-keys-panel__modal-stack">
      <div className="api-keys-panel__modal-field">
        <Text variant="subheader-1">{t('apiKeysPanel.createModal.keyName')}</Text>
        <TextInput
          size="l"
          placeholder={t('apiKeysPanel.createModal.placeholder')}
          value={newKeyName}
          onUpdate={onNewKeyNameChange}
          autoFocus
        />
      </div>

      <div className="api-keys-panel__modal-alert">
        <Alert
          theme="info"
          title={t('apiKeysPanel.createModal.alertTitle')}
          message={t('apiKeysPanel.createModal.alertMessage')}
        />
      </div>
    </div>
  );

  const createKeyFooter = (
    <div className="api-keys-panel__modal-footer">
      <Button
        view="outlined"
        size="l"
        onClick={() => onShowCreateModalChange?.(false)}
        disabled={creating}
      >
        {t('apiKeysPanel.createModal.cancel')}
      </Button>
      <Button
        view="action"
        size="l"
        onClick={onCreateKey}
        loading={creating}
        disabled={creating}
      >
        {t('apiKeysPanel.createKey')}
      </Button>
    </div>
  );

  const newKeyContent = newKeyData ? (
    <div className="api-keys-panel__modal-stack">
      <div className="api-keys-panel__modal-field">
        <Text variant="subheader-1">{t('apiKeysPanel.newKeyModal.nameLabel')}</Text>
        <Text variant="body-1">{newKeyData.name}</Text>
      </div>

      <div className="api-keys-panel__modal-field">
        <Text variant="subheader-1">{t('apiKeysPanel.newKeyModal.keyLabel')}</Text>
        <Text variant="body-1" color="secondary">
          {t('apiKeysPanel.newKeyModal.keyHint')}
        </Text>
        <div className="api-keys-panel__key-display">
          <Text variant="body-2" className="api-keys-panel__key-value">
            {showNewKeyValue ? newKeyData.key : t('apiKeysPanel.newKeyModal.hiddenKey')}
          </Text>
          <Button view="flat" size="s" onClick={onToggleShowNewKeyValue}>
            <Icon data={showNewKeyValue ? EyeSlash : Eye} size={16} />
          </Button>
          <Button
            view="action"
            size="l"
            onClick={() => newKeyData.key && onCopyKey?.(newKeyData.key)}
          >
            <Icon data={Copy} size={16} />
            {t('apiKeysPanel.newKeyModal.copy')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const newKeyFooter = (
    <Button view="outlined" size="l" onClick={onCloseNewKey}>
      {t('apiKeysPanel.newKeyModal.close')}
    </Button>
  );

  if (loading) {
    return (
      <section className={panelClassName} aria-label={t('apiKeysPanel.title')}>
        <div className="api-keys-panel__title-group">
          <Text variant="subheader-3">{t('apiKeysPanel.title')}</Text>
          <Text variant="body-1" color="secondary">
            {t('apiKeysPanel.description')}
          </Text>
        </div>
        <div className="api-keys-panel__content">
          <div className="api-keys-panel__skeleton-stack">
            <Skeleton className="api-keys-panel__skeleton-row" />
            <Skeleton className="api-keys-panel__skeleton-row" />
          </div>
          <Skeleton className="api-keys-panel__skeleton-button" />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={panelClassName} aria-label={t('apiKeysPanel.title')}>
        <div className="api-keys-panel__header">
          <div className="api-keys-panel__title-group">
            <div className="api-keys-panel__title-row">
              <Text variant="subheader-3">{t('apiKeysPanel.title')}</Text>
              <HelpMark>
                <Text variant="body-1" color="secondary">
                  {t('apiKeysPanel.help')}
                </Text>
              </HelpMark>
            </div>
            <Text variant="body-1" color="secondary">
              {t('apiKeysPanel.description')}
            </Text>
          </div>
          <Button
            view="outlined"
            size="m"
            onClick={() => window.open(DOCS_URL, '_blank')}
          >
            <Icon data={BookOpen} size={16} />
            {t('apiKeysPanel.docs')}
          </Button>
        </div>

        <div className="api-keys-panel__content">
          {apiKeys.length === 0 ? (
            <div className="api-keys-panel__empty">
              <Text variant="subheader-1" color="secondary">
                <Icon data={Key} size={44} className="api-keys-panel__empty-icon" />
                {t('apiKeysPanel.empty')}
              </Text>
              <Button
                view="action"
                size="l"
                onClick={() => onShowCreateModalChange?.(true)}
              >
                <Icon data={Plus} size={16} />
                {t('apiKeysPanel.createKey')}
              </Button>
            </div>
          ) : (
            <>
              <Table
                data={tableData}
                columns={columns}
                verticalAlign="middle"
                edgePadding={false}
                className="api-keys-panel__table"
              />
              <Button
                view="normal"
                size="l"
                onClick={() => onShowCreateModalChange?.(true)}
                className="api-keys-panel__create-button"
              >
                <Icon data={Plus} size={16} />
                {t('apiKeysPanel.createKey')}
              </Button>
            </>
          )}
        </div>
      </section>

      {isMobile ? (
        <DrawerMenu
          open={showCreateModal}
          onClose={() => onShowCreateModalChange?.(false)}
          title={t('apiKeysPanel.createModal.title')}
          footer={createKeyFooter}
        >
          {createKeyContent}
        </DrawerMenu>
      ) : (
        <Dialog
          open={showCreateModal}
          onClose={() => onShowCreateModalChange?.(false)}
          onEnterKeyDown={onCreateKey}
          aria-labelledby="create-api-key-dialog-title"
        >
          <Dialog.Header
            caption={t('apiKeysPanel.createModal.title')}
            id="create-api-key-dialog-title"
          />
          <Dialog.Body>{createKeyContent}</Dialog.Body>
          <Dialog.Footer
            textButtonApply={t('apiKeysPanel.createKey')}
            textButtonCancel={t('apiKeysPanel.createModal.cancel')}
            onClickButtonCancel={() => onShowCreateModalChange?.(false)}
            onClickButtonApply={onCreateKey}
            propsButtonApply={{ loading: creating, disabled: creating }}
            propsButtonCancel={{ disabled: creating }}
          />
        </Dialog>
      )}

      {isMobile ? (
        <DrawerMenu
          open={showNewKey}
          onClose={onCloseNewKey}
          title={t('apiKeysPanel.newKeyModal.title')}
          footer={newKeyFooter}
        >
          {newKeyContent}
        </DrawerMenu>
      ) : (
        <Dialog
          size="m"
          open={showNewKey}
          onClose={onCloseNewKey}
          aria-labelledby="new-api-key-dialog-title"
        >
          <Dialog.Header
            caption={t('apiKeysPanel.newKeyModal.title')}
            id="new-api-key-dialog-title"
          />
          <Dialog.Body>{newKeyContent}</Dialog.Body>
          <Dialog.Footer
            textButtonCancel={t('apiKeysPanel.newKeyModal.close')}
            onClickButtonCancel={onCloseNewKey}
          />
        </Dialog>
      )}
    </>
  );
}

export function ApiKeysPanelConnected({
  fullWidth,
  className,
}: Pick<ApiKeysPanelProps, 'fullWidth' | 'className'>) {
  const apiKeysState = useApiKeys();

  return (
    <ApiKeysPanel
      apiKeys={apiKeysState.apiKeys}
      loading={apiKeysState.loading}
      creating={apiKeysState.creating}
      showCreateModal={apiKeysState.showCreateModal}
      onShowCreateModalChange={apiKeysState.setShowCreateModal}
      newKeyName={apiKeysState.newKeyName}
      onNewKeyNameChange={apiKeysState.setNewKeyName}
      onCreateKey={apiKeysState.createApiKey}
      showNewKey={apiKeysState.showNewKey}
      onCloseNewKey={apiKeysState.closeNewKeyModal}
      newKeyData={apiKeysState.newKeyData}
      showNewKeyValue={apiKeysState.showNewKeyValue}
      onToggleShowNewKeyValue={() => apiKeysState.setShowNewKeyValue((value) => !value)}
      onCopyKey={apiKeysState.copyToClipboard}
      onToggleStatus={apiKeysState.toggleApiKeyStatus}
      onDelete={apiKeysState.deleteApiKey}
      formatRelativeTime={apiKeysState.formatRelativeTime}
      fullWidth={fullWidth}
      className={className}
    />
  );
}
