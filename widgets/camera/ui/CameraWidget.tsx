"use client";

import { Text } from "@gravity-ui/uikit";
import { CameraPanel } from "@/features/camera/ui";
import "./CameraWidget.css";

export function CameraWidget() {
  return (
    <section className="camera-widget" aria-label="Camera capture block">
      <div className="camera-widget__header">
        <Text variant="subheader-3">Камера</Text>
        <Text variant="body-2" color="secondary">
          Сделайте фото и сохраните его прямо в галерею пользователя.
        </Text>
      </div>
      <CameraPanel />
    </section>
  );
}
