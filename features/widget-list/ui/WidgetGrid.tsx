"use client";

import { useRouter } from "next/navigation";
import { Card, Label, Switch, Text, DropdownMenu } from "@gravity-ui/uikit";
import { UserWidget } from "@/shared/types/widget";
import { useI18n } from "@/app/contexts/I18nContext";
import "./WidgetGrid.css";

type WidgetGridProps = {
  widgets: UserWidget[];
  isOwnerView: boolean;
  onToggleEnabled: (widgetId: string, enabled: boolean) => void;
  onDelete?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isPublic: boolean) => void;
};

export function WidgetGrid({
  widgets,
  isOwnerView,
  onToggleEnabled,
  onDelete,
  onToggleVisibility,
}: WidgetGridProps) {
  const { t } = useI18n();
  const router = useRouter();

  if (widgets.length === 0) {
    return (
      <div className="widget-grid__empty">
        <Text variant="body-1" color="secondary">
          {isOwnerView ? t('widgetGrid.emptyMy') : t('widgetGrid.emptyPublic')}
        </Text>
      </div>
    );
  }

  return (
    <div className="widget-grid">
      {widgets.map((widget) => {
        const authorName = widget.author?.name || widget.author?.username;

        return (
          <Card key={widget.id} className="widget-grid__card" view="outlined" type="container">
            <div
              className="widget-grid__card-main"
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/widgets/${widget.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') router.push(`/widgets/${widget.id}`);
              }}
            >
              <div className="widget-grid__card-header">
                <Text variant="subheader-2" ellipsis>
                  {widget.title}
                </Text>
                {isOwnerView && (
                  <Label theme={widget.is_public ? 'success' : 'unknown'} size="xs">
                    {widget.is_public ? t('widgetGrid.public') : t('widgetGrid.private')}
                  </Label>
                )}
              </div>
              {widget.description && (
                <Text variant="body-2" color="secondary" className="widget-grid__description">
                  {widget.description}
                </Text>
              )}
              <div className="widget-grid__meta">
                {!isOwnerView && authorName && (
                  <Text variant="caption-2" color="secondary">
                    {t('widgetGrid.author')}: {authorName}
                  </Text>
                )}
                <div className="widget-grid__permissions">
                  {widget.permissions.map((permission) => (
                    <Label key={permission} theme="info" size="xs">
                      {t(`widgetPermissions.${permission}`)}
                    </Label>
                  ))}
                </div>
              </div>
            </div>

            <div className="widget-grid__card-footer">
              <Switch
                checked={Boolean(widget.enabled)}
                onUpdate={(checked) => onToggleEnabled(widget.id, checked)}
                content={t('widgetGrid.enabled')}
                size="m"
              />
              {isOwnerView && (onDelete || onToggleVisibility) && (
                <DropdownMenu
                  items={[
                    ...(onToggleVisibility
                      ? [
                          {
                            text: widget.is_public
                              ? t('widgetGrid.makePrivate')
                              : t('widgetGrid.makePublic'),
                            action: () => onToggleVisibility(widget.id, !widget.is_public),
                          },
                        ]
                      : []),
                    ...(onDelete
                      ? [
                          {
                            text: t('widgetGrid.delete'),
                            theme: 'danger' as const,
                            action: () => onDelete(widget.id),
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
