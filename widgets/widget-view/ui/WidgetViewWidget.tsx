"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@gravity-ui/icons";
import { Button, Icon, Label, Spin, Text, useToaster } from "@gravity-ui/uikit";
import { UserWidget, WidgetGrant, WidgetPermission } from "@/shared/types/widget";
import { WidgetApi } from "@/shared/api/widgets";
import { WidgetSandbox } from "@/features/widget-runtime/ui/WidgetSandbox";
import { WidgetPermissionsDialog } from "@/features/widget-runtime/ui/WidgetPermissionsDialog";
import { notifyUserWidgetsChanged } from "@/features/widget-list/model/useWidgets";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/app/contexts/I18nContext";
import "./WidgetViewWidget.css";

type WidgetViewWidgetProps = {
  widgetId: string;
};

export function WidgetViewWidget({ widgetId }: WidgetViewWidgetProps) {
  const { t } = useI18n();
  const router = useRouter();
  const toaster = useToaster();

  const [widget, setWidget] = useState<UserWidget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [grantedPermissions, setGrantedPermissions] = useState<WidgetPermission[] | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [{ data, grant }, { data: auth }] = await Promise.all([
          WidgetApi.getWidget(widgetId),
          supabase.auth.getSession(),
        ]);
        if (cancelled) return;

        setWidget(data);
        setCurrentUserId(auth.session?.user?.id ?? null);

        const granted = ((grant as WidgetGrant | null)?.permissions || []) as WidgetPermission[];
        const missing = data.permissions.filter((permission) => !granted.includes(permission));
        if (missing.length > 0) {
          setNeedsConsent(true);
        } else {
          setGrantedPermissions(granted);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load widget');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [widgetId]);

  const handleAllow = async () => {
    if (!widget) return;
    try {
      setIsGranting(true);
      const { data } = await WidgetApi.grantPermissions(widget.id, widget.permissions);
      setGrantedPermissions((data.permissions || []) as WidgetPermission[]);
      setNeedsConsent(false);
      notifyUserWidgetsChanged();
    } catch (error) {
      toaster.add({
        name: 'widget-grant-error',
        title: t('widgetView.actionError'),
        content: error instanceof Error ? error.message : undefined,
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!widget) return;
    try {
      setIsMutating(true);
      const { data } = await WidgetApi.updateWidget(widget.id, { is_public: !widget.is_public });
      setWidget({ ...widget, is_public: data.is_public });
    } catch (error) {
      toaster.add({
        name: 'widget-visibility-error',
        title: t('widgetView.actionError'),
        content: error instanceof Error ? error.message : undefined,
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!widget) return;
    try {
      setIsMutating(true);
      await WidgetApi.deleteWidget(widget.id);
      notifyUserWidgetsChanged();
      router.push('/widgets');
    } catch (error) {
      setIsMutating(false);
      toaster.add({
        name: 'widget-delete-error',
        title: t('widgetView.actionError'),
        content: error instanceof Error ? error.message : undefined,
        theme: 'danger',
        autoHiding: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="widget-view__loading">
        <Spin size="l" />
      </div>
    );
  }

  if (loadError || !widget) {
    return (
      <div className="widget-view__error">
        <Text variant="header-1">{t('widgetView.notFound')}</Text>
        <Button view="action" size="l" onClick={() => router.push('/widgets')}>
          {t('widgetView.backToList')}
        </Button>
      </div>
    );
  }

  const isOwner = currentUserId === widget.user_id;
  const authorName = widget.author?.name || widget.author?.username;

  return (
    <section className="widget-view">
      <header className="widget-view__header">
        <div className="widget-view__header-left">
          <Button view="flat" size="l" onClick={() => router.push('/widgets')}>
            <Icon data={ArrowLeft} size={18} />
          </Button>
          <div className="widget-view__title-block">
            <Text variant="header-1">{widget.title}</Text>
            <div className="widget-view__meta">
              <Label theme={widget.is_public ? 'success' : 'unknown'} size="s">
                {widget.is_public ? t('widgetView.public') : t('widgetView.private')}
              </Label>
              {!isOwner && authorName && (
                <Text variant="body-2" color="secondary">
                  {t('widgetView.author')}: {authorName}
                </Text>
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="widget-view__actions">
            <Button view="outlined" size="m" onClick={() => void handleToggleVisibility()} loading={isMutating}>
              {widget.is_public ? t('widgetView.makePrivate') : t('widgetView.makePublic')}
            </Button>
            <Button view="outlined-danger" size="m" onClick={() => void handleDelete()} disabled={isMutating}>
              {t('widgetView.delete')}
            </Button>
          </div>
        )}
      </header>

      {widget.description && (
        <Text variant="body-1" color="secondary">
          {widget.description}
        </Text>
      )}

      <div className="widget-view__sandbox">
        {grantedPermissions !== null ? (
          <WidgetSandbox
            html={widget.html}
            title={widget.title}
            widgetId={widget.id}
            grantedPermissions={grantedPermissions}
          />
        ) : (
          !needsConsent && (
            <div className="widget-view__loading">
              <Spin size="m" />
            </div>
          )
        )}
      </div>

      {needsConsent && (
        <WidgetPermissionsDialog
          widget={widget}
          onAllow={() => void handleAllow()}
          onCancel={() => router.push('/widgets')}
          loading={isGranting}
        />
      )}
    </section>
  );
}
