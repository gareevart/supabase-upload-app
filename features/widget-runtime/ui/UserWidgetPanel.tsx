"use client";

import { Xmark } from "@gravity-ui/icons";
import { useEffect, useRef, useState } from "react";
import { Button, Icon, Spin, Text } from "@gravity-ui/uikit";
import { UserWidget, WidgetPermission } from "@/shared/types/widget";
import { WidgetApi } from "@/shared/api/widgets";
import { useI18n } from "@/app/contexts/I18nContext";
import { WidgetSandbox } from "./WidgetSandbox";
import { WidgetPermissionsDialog } from "./WidgetPermissionsDialog";
import "./UserWidgetPanel.css";

type UserWidgetPanelProps = {
  widget: UserWidget;
  draggable?: boolean;
  zIndex?: number;
  onActivate?: () => void;
  onClose?: () => void;
  className?: string;
};

// Floating window for an AI-generated widget, opened from the navigation
// widgets panel. Mirrors the CameraPanel floating window behaviour.
export function UserWidgetPanel({
  widget,
  draggable = false,
  zIndex,
  onActivate,
  onClose,
  className,
}: UserWidgetPanelProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const panelRef = useRef<HTMLElement>(null);

  const [grantedPermissions, setGrantedPermissions] = useState<WidgetPermission[] | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGrant = async () => {
      try {
        const { grant } = await WidgetApi.getWidget(widget.id);
        if (cancelled) return;
        const granted = (grant?.permissions || []) as WidgetPermission[];
        const missing = widget.permissions.filter((permission) => !granted.includes(permission));
        if (missing.length > 0) {
          setNeedsConsent(true);
        } else {
          setGrantedPermissions(granted);
        }
      } catch (error) {
        console.error("Failed to load widget grant:", error);
        if (!cancelled) {
          setNeedsConsent(true);
        }
      }
    };

    void loadGrant();
    return () => {
      cancelled = true;
    };
  }, [widget.id, widget.permissions]);

  const handleAllow = async () => {
    try {
      setIsGranting(true);
      const { data } = await WidgetApi.grantPermissions(widget.id, widget.permissions);
      setGrantedPermissions((data.permissions || []) as WidgetPermission[]);
      setNeedsConsent(false);
    } catch (error) {
      console.error("Failed to grant widget permissions:", error);
    } finally {
      setIsGranting(false);
    }
  };

  useEffect(() => {
    if (!draggable) return;
    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const nextX = Math.max(16, (window.innerWidth - panelRect.width) / 2);
    const nextY = Math.max(16, (window.innerHeight - panelRect.height) / 2);
    setPosition({ x: nextX, y: nextY });
  }, [draggable]);

  const handleWindowDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) return;
    event.preventDefault();

    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const dragStartX = event.clientX;
    const dragStartY = event.clientY;
    const originX = position.x;
    const originY = position.y;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;

    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX;
      const deltaY = moveEvent.clientY - dragStartY;

      const maxX = Math.max(16, window.innerWidth - panelWidth - 16);
      const maxY = Math.max(16, window.innerHeight - panelHeight - 16);

      setPosition({
        x: Math.min(maxX, Math.max(16, originX + deltaX)),
        y: Math.min(maxY, Math.max(16, originY + deltaY)),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section
      ref={panelRef}
      className={`user-widget-panel ${draggable ? "user-widget-panel--floating" : ""} ${isDragging ? "user-widget-panel--dragging" : ""} ${className ?? ""}`}
      style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, zIndex } : undefined}
      onPointerDownCapture={draggable ? onActivate : undefined}
      aria-label={widget.title}
      role={draggable ? "dialog" : undefined}
      aria-modal={draggable ? "false" : undefined}
    >
      {draggable && (
        <div
          className="user-widget-panel__drag-zone"
          onPointerDown={handleWindowDragStart}
          aria-hidden="true"
        />
      )}

      <div
        className={`user-widget-panel__header ${draggable ? "user-widget-panel__header--draggable" : ""}`}
        onPointerDown={handleWindowDragStart}
      >
        <Text variant="subheader-1" className="user-widget-panel__title" ellipsis>
          {widget.title}
        </Text>
        {onClose && (
          <Button
            size="s"
            view="outlined"
            aria-label={t('userWidgetPanel.close')}
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon data={Xmark} size={14} />
          </Button>
        )}
      </div>

      <div className="user-widget-panel__body">
        {grantedPermissions !== null ? (
          <WidgetSandbox
            html={widget.html}
            title={widget.title}
            widgetId={widget.id}
            grantedPermissions={grantedPermissions}
          />
        ) : (
          !needsConsent && (
            <div className="user-widget-panel__loading">
              <Spin size="m" />
            </div>
          )
        )}
      </div>

      {needsConsent && (
        <WidgetPermissionsDialog
          widget={widget}
          onAllow={() => void handleAllow()}
          onCancel={() => onClose?.()}
          loading={isGranting}
        />
      )}
    </section>
  );
}
