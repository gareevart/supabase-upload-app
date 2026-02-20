"use client";

import { Camera, FloppyDisk, Xmark } from "@gravity-ui/icons";
import { useEffect, useRef, useState } from "react";
import { Button, Icon, Spin, Text } from "@gravity-ui/uikit";
import { useCameraCapture } from "@/features/camera/model/useCameraCapture";
import "./CameraPanel.css";

type CameraPanelProps = {
  draggable?: boolean;
  zIndex?: number;
  onActivate?: () => void;
  onClose?: () => void;
  className?: string;
};

export function CameraPanel({ draggable = false, zIndex, onActivate, onClose, className }: CameraPanelProps) {
  const {
    videoRef,
    previewUrl,
    isCameraActive,
    isStarting,
    isSaving,
    error,
    capturePhoto,
    reshootPhoto,
    savePhoto,
    hasSnapshot,
  } = useCameraCapture();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!draggable) {
      return;
    }

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const nextX = Math.max(16, (window.innerWidth - panelRect.width) / 2);
    const nextY = Math.max(16, (window.innerHeight - panelRect.height) / 2);

    setPosition({ x: nextX, y: nextY });
  }, [draggable]);

  const handleWindowDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) {
      return;
    }

    event.preventDefault();

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

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

      const nextX = Math.min(maxX, Math.max(16, originX + deltaX));
      const nextY = Math.min(maxY, Math.max(16, originY + deltaY));

      setPosition({ x: nextX, y: nextY });
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
      className={`camera-panel ${draggable ? "camera-panel--floating" : ""} ${isDragging ? "camera-panel--dragging" : ""} ${className ?? ""}`}
      style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, zIndex } : undefined}
      onPointerDownCapture={draggable ? onActivate : undefined}
      aria-label="Camera widget"
      role={draggable ? "dialog" : undefined}
      aria-modal={draggable ? "false" : undefined}
    >
      {draggable && (
        <div
          className="camera-panel__drag-zone"
          onPointerDown={handleWindowDragStart}
          aria-hidden="true"
        />
      )}

      <div
        className={`camera-panel__header ${draggable ? "camera-panel__header--draggable" : ""}`}
        onPointerDown={handleWindowDragStart}
      >
        {onClose ? (
          <Button
            size="s"
            view="outlined"
            aria-label="Close camera widget"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon data={Xmark} size={14} />
          </Button>
        ) : (
          <div className="camera-panel__header-spacer" aria-hidden="true" />
        )}
      </div>

      <div className="camera-panel__media-frame" aria-live="polite">
        <video
          ref={videoRef}
          className="camera-panel__video"
          autoPlay
          playsInline
          muted
        />

        {previewUrl && (
          <img
            className="camera-panel__preview-image"
            src={previewUrl}
            alt="Captured photo preview"
          />
        )}

        {!isCameraActive && !previewUrl && (
          <div className="camera-panel__media-overlay">
            {isStarting ? (
              <Spin size="m" />
            ) : (
              <Text variant="body-2" color="secondary">
                Камера недоступна
              </Text>
            )}
          </div>
        )}
      </div>

      <div className="camera-panel__actions">
        <Button
          view="action"
          size="xl"
          className="camera-panel__button camera-panel__button--primary"
          onClick={() => (hasSnapshot ? void reshootPhoto() : void capturePhoto())}
          disabled={hasSnapshot ? isStarting : !isCameraActive || isStarting}
        >
          <Icon data={Camera} size={18} />
          {hasSnapshot ? "Reshoot" : "Shoot"}
        </Button>
        <Button
          view="normal"
          size="xl"
          className="camera-panel__button"
          onClick={() => void savePhoto()}
          disabled={!hasSnapshot || isSaving}
          loading={isSaving}
        >
          <Icon data={FloppyDisk} size={18} />
          Save
        </Button>
      </div>

      {error && (
        <Text variant="caption-2" color="danger">
          {error}
        </Text>
      )}
    </section>
  );
}
