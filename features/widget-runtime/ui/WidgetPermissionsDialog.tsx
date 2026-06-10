"use client";

import { Person, Picture, Camera, Database } from "@gravity-ui/icons";
import { Dialog, Icon, Text } from "@gravity-ui/uikit";
import { UserWidget, WidgetPermission } from "@/shared/types/widget";
import { useI18n } from "@/app/contexts/I18nContext";
import "./WidgetPermissionsDialog.css";

const PERMISSION_ICONS: Record<WidgetPermission, typeof Person> = {
  profile: Person,
  gallery: Picture,
  camera: Camera,
  storage: Database,
};

type WidgetPermissionsDialogProps = {
  widget: Pick<UserWidget, "title" | "description" | "permissions"> & {
    author?: UserWidget["author"];
  };
  onAllow: () => void;
  onCancel: () => void;
  loading?: boolean;
};

// Consent dialog shown before a widget gets access to user data
export function WidgetPermissionsDialog({
  widget,
  onAllow,
  onCancel,
  loading,
}: WidgetPermissionsDialogProps) {
  const { t } = useI18n();
  const authorName = widget.author?.name || widget.author?.username;

  return (
    <Dialog open onClose={onCancel} aria-labelledby="widget-permissions-dialog-title">
      <Dialog.Header
        caption={t('widgetPermissions.title')}
        id="widget-permissions-dialog-title"
      />
      <Dialog.Body>
        <div className="widget-permissions">
          <Text variant="subheader-2">{widget.title}</Text>
          {authorName && (
            <Text variant="body-2" color="secondary">
              {t('widgetPermissions.author')}: {authorName}
            </Text>
          )}
          {widget.description && (
            <Text variant="body-2" color="secondary">
              {widget.description}
            </Text>
          )}
          {widget.permissions.length > 0 ? (
            <>
              <Text variant="body-1">{t('widgetPermissions.requests')}</Text>
              <ul className="widget-permissions__list">
                {widget.permissions.map((permission) => (
                  <li key={permission} className="widget-permissions__item">
                    <Icon data={PERMISSION_ICONS[permission]} size={16} />
                    <div>
                      <Text variant="body-2">
                        {t(`widgetPermissions.${permission}`)}
                      </Text>
                      <Text variant="caption-2" color="secondary" as="div">
                        {t(`widgetPermissions.${permission}Hint`)}
                      </Text>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Text variant="body-2" color="secondary">
              {t('widgetPermissions.noPermissions')}
            </Text>
          )}
        </div>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onCancel}
        onClickButtonApply={onAllow}
        textButtonApply={t('widgetPermissions.allow')}
        textButtonCancel={t('widgetPermissions.cancel')}
        propsButtonApply={{ loading }}
      />
    </Dialog>
  );
}
