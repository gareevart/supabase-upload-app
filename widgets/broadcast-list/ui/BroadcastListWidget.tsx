"use client";

import React from 'react';
import { Button, Text, Icon, SegmentedRadioGroup, Table, TableColumnConfig, Spin } from '@gravity-ui/uikit';
import { Plus, Pencil, TrashBin, ArrowUturnCwLeft, ChevronRight, Eye } from '@gravity-ui/icons';
import { Broadcast, BroadcastStatus } from '@/entities/broadcast/model';
import { useBroadcastList } from '@/features/broadcast-list/model/useBroadcastList';
import { useRouter } from 'next/navigation';

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'sent' | 'failed';

const BroadcastListWidget: React.FC = () => {
  const router = useRouter();
  const {
    broadcasts,
    isLoading,
    error,
    filters,
    updateFilters,
    deleteBroadcast,
    sendBroadcast,
    cancelSchedule,
  } = useBroadcastList();

  const handleCreateNew = () => {
    router.push('/broadcasts/new');
  };

  const handleEdit = (id: string) => {
    router.push(`/broadcasts/edit/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/broadcasts/${id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteBroadcast(id);
  };

  const handleSend = async (id: string) => {
    await sendBroadcast(id);
  };

  const handleCancelSchedule = async (id: string) => {
    await cancelSchedule(id);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as StatusFilter;
    updateFilters({
      status: value === 'all' ? undefined : value as BroadcastStatus
    });
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge component
  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'secondary' as const,
      scheduled: 'info' as const,
      sending: 'warning' as const,
      sent: 'positive' as const,
      failed: 'danger' as const,
    };

    const statusLabels = {
      draft: 'Черновик',
      scheduled: 'Запланировано',
      sending: 'Отправляется',
      sent: 'Отправлено',
      failed: 'Ошибка',
    };

    return (
      <Text
        color={statusColors[status as keyof typeof statusColors] || 'secondary'}
        variant="body-2"
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Text>
    );
  };

  // Render actions based on broadcast status
  const renderActions = (broadcast: Broadcast) => {
    const { id, status } = broadcast;

    const actionButtons = [];

    switch (status) {
      case 'draft':
        actionButtons.push(
          <Button
            key="edit"
            view="flat"
            size="s"
            onClick={() => handleEdit(id)}
            title="Редактировать"
          >
            <Icon data={Pencil} size={16} />
          </Button>,
          <Button
            key="send"
            view="flat"
            size="s"
            onClick={() => handleSend(id)}
            title="Отправить"
          >
            <Icon data={ArrowUturnCwLeft} size={16} />
          </Button>,
          <Button
            key="delete"
            view="flat-danger"
            size="s"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(id);
            }}
            title="Удалить"
          >
            <Icon data={TrashBin} size={16} />
          </Button>
        );
        break;
      case 'scheduled':
        actionButtons.push(
          <Button
            key="send"
            view="flat"
            size="s"
            onClick={() => handleSend(id)}
            title="Отправить сейчас"
          >
            <Icon data={ArrowUturnCwLeft} size={16} />
          </Button>,
          <Button
            key="cancel"
            view="flat"
            size="s"
            onClick={() => handleCancelSchedule(id)}
            title="Отменить планирование"
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
        );
        break;
      case 'sent':
        actionButtons.push(
          <Button
            key="view"
            view="flat"
            size="s"
            onClick={() => handleView(id)}
            title="Просмотр деталей"
          >
            <Icon data={Eye} size={16} />
          </Button>,
          <Button
            key="delete"
            view="flat-danger"
            size="s"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(id);
            }}
            title="Удалить"
          >
            <Icon data={TrashBin} size={16} />
          </Button>
        );
        break;
      case 'failed':
        actionButtons.push(
          <Button
            key="retry"
            view="flat"
            size="s"
            onClick={() => handleSend(id)}
            title="Повторить отправку"
          >
            <Icon data={ArrowUturnCwLeft} size={16} />
          </Button>,
          <Button
            key="delete"
            view="flat-danger"
            size="s"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(id);
            }}
            title="Удалить"
          >
            <Icon data={TrashBin} size={16} />
          </Button>
        );
        break;
    }

    return (
      <div className="flex gap-1">
        {actionButtons}
      </div>
    );
  };

  // Table columns configuration
  const columns: TableColumnConfig<Broadcast>[] = [
    {
      id: 'subject',
      name: 'Тема',
      template: (item) => (
        <Text
          variant="body-2"
          className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
          onClick={() => handleView(item.id)}
          title="Кликните для просмотра рассылки"
        >
          {item.subject}
        </Text>
      ),
      width: 300,
    },
    {
      id: 'status',
      name: 'Статус',
      template: (item) => getStatusBadge(item.status),
      width: 120,
    },
    {
      id: 'recipients',
      name: 'Получатели',
      template: (item) => (
        <Text variant="body-2">
          {item.total_recipients}
        </Text>
      ),
      width: 100,
    },
    {
      id: 'stats',
      name: 'Статистика',
      template: (item) => {
        if (item.status === 'sent') {
          const openRate = item.total_recipients > 0
            ? Math.round(((item.opened_count ?? 0) / item.total_recipients) * 100)
            : 0;
          const clickRate = item.total_recipients > 0
            ? Math.round(((item.clicked_count ?? 0) / item.total_recipients) * 100)
            : 0;

          return (
            <div className="text-xs">
              <div>Открыто: {item.opened_count ?? 0} ({openRate}%)</div>
              <div>Клики: {item.clicked_count ?? 0} ({clickRate}%)</div>
            </div>
          );
        }
        return <Text variant="body-2" color="secondary">—</Text>;
      },
      width: 150,
    },
    {
      id: 'date',
      name: 'Дата',
      template: (item) => {
        let dateToShow = '';
        let label = '';

        if (item.status === 'scheduled' && item.scheduled_for) {
          dateToShow = formatDate(item.scheduled_for);
          label = 'Запланировано на:';
        } else if (item.status === 'sent' && item.sent_at) {
          dateToShow = formatDate(item.sent_at);
          label = 'Отправлено:';
        } else {
          dateToShow = formatDate(item.created_at);
          label = 'Создано:';
        }

        return (
          <div className="text-xs">
            <div className="text-gray-500">{label}</div>
            <div>{dateToShow}</div>
          </div>
        );
      },
      width: 180,
    },
    {
      id: 'actions',
      name: 'Действия',
      template: (item) => renderActions(item),
      width: 150,
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col text-start">
          <Text variant="display-1" className="mb-1">Email рассылки</Text>
          <Text variant="body-1" color="secondary">
            Создавайте, планируйте и управляйте email рассылками
          </Text>
        </div>

        <Button
          view="action"
          size="l"
          onClick={handleCreateNew}
        >
          <Icon data={Plus} size={16} />
          Новая рассылка
        </Button>
      </div>

      <div className="mb-6">
        <SegmentedRadioGroup
          size="m"
          value={filters.status || 'all'}
          onChange={handleStatusFilterChange}
          options={[
            { value: 'all', content: 'Все' },
            { value: 'draft', content: 'Черновики' },
            { value: 'scheduled', content: 'Запланированные' },
            { value: 'sent', content: 'Отправленные' },
            { value: 'failed', content: 'С ошибками' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin size="m" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <Text variant="body-1" className="text-red-500 mb-4">{error}</Text>
          <Button
            view="normal"
            size="l"
            onClick={() => router.push('/debug')}
          >
            Перейти к отладке
          </Button>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col gap-2 items-center text-center py-8">
          <Text variant="header-2" className="mb-4">Рассылки не найдены</Text>
          <Button
            view="action"
            size="l"
            onClick={handleCreateNew}
          >
            Создать рассылку
          </Button>
        </div>
      ) : (
        <Table
          data={broadcasts}
          columns={columns}
          verticalAlign="top"
        />
      )}
    </div>
  );
};

export default BroadcastListWidget;
