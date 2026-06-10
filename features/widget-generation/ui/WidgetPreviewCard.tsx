"use client";

import { useState } from "react";
import { Button, Disclosure, Label, Link, Text } from "@gravity-ui/uikit";
import { ParsedWidgetBlock } from "@/features/widget-runtime/lib/parseWidgetBlock";
import { WidgetSandbox } from "@/features/widget-runtime/ui/WidgetSandbox";
import { useI18n } from "@/app/contexts/I18nContext";
import { useSaveWidget } from "../model/useSaveWidget";
import "./WidgetPreviewCard.css";

type WidgetPreviewCardProps = {
  widget: ParsedWidgetBlock;
};

// Live preview of a widget generated in the chat, with save controls.
// Preview runs with the declared permissions auto-granted: the user has just
// asked the assistant to build this widget.
export function WidgetPreviewCard({ widget }: WidgetPreviewCardProps) {
  const { t } = useI18n();
  const { saveWidget, isSaving, savedWidget } = useSaveWidget(widget);
  const [savingVisibility, setSavingVisibility] = useState<"private" | "public" | null>(null);

  const handleSave = async (isPublic: boolean) => {
    setSavingVisibility(isPublic ? "public" : "private");
    await saveWidget(isPublic);
    setSavingVisibility(null);
  };

  return (
    <div className="widget-preview-card">
      <div className="widget-preview-card__header">
        <Text variant="subheader-2">{widget.manifest.title}</Text>
        <div className="widget-preview-card__permissions">
          {widget.manifest.permissions.map((permission) => (
            <Label key={permission} theme="info" size="xs">
              {t(`widgetPermissions.${permission}`)}
            </Label>
          ))}
        </div>
      </div>

      {widget.manifest.description && (
        <Text variant="body-2" color="secondary">
          {widget.manifest.description}
        </Text>
      )}

      <div className="widget-preview-card__sandbox">
        <WidgetSandbox
          html={widget.html}
          title={widget.manifest.title}
          widgetId={savedWidget?.id ?? null}
          grantedPermissions={widget.manifest.permissions}
        />
      </div>

      <div className="widget-preview-card__actions">
        {savedWidget ? (
          <Link href={`/widgets/${savedWidget.id}`} view="normal">
            {t('widgetPreview.openSaved')}
          </Link>
        ) : (
          <>
            <Button
              view="action"
              size="m"
              loading={isSaving && savingVisibility === "private"}
              disabled={isSaving}
              onClick={() => void handleSave(false)}
            >
              {t('widgetPreview.savePrivate')}
            </Button>
            <Button
              view="outlined"
              size="m"
              loading={isSaving && savingVisibility === "public"}
              disabled={isSaving}
              onClick={() => void handleSave(true)}
            >
              {t('widgetPreview.savePublic')}
            </Button>
          </>
        )}
      </div>

      <Disclosure summary={t('widgetPreview.showCode')} size="m">
        <pre className="widget-preview-card__code">
          <code>{widget.html}</code>
        </pre>
      </Disclosure>
    </div>
  );
}
