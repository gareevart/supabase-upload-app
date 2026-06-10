"use client";

import { Camera } from "@gravity-ui/icons";
import { Button, Dialog, Icon, Spin, Text } from "@gravity-ui/uikit";
import { useCameraCapture } from "@/features/camera/model/useCameraCapture";
import { useI18n } from "@/app/contexts/I18nContext";
import "./WidgetCameraDialog.css";

type WidgetCameraDialogProps = {
  onPhoto: (url: string) => void;
  onCancel: () => void;
};

// Host-side camera broker UI: getUserMedia is blocked inside the sandboxed
// iframe, so photos are taken here and the URL is returned to the widget.
export function WidgetCameraDialog({ onPhoto, onCancel }: WidgetCameraDialogProps) {
  const { t } = useI18n();
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

  const handleUsePhoto = async () => {
    const url = await savePhoto();
    if (url) {
      onPhoto(url);
    }
  };

  return (
    <Dialog open onClose={onCancel} aria-labelledby="widget-camera-dialog-title">
      <Dialog.Header caption={t('widgetCamera.title')} id="widget-camera-dialog-title" />
      <Dialog.Body>
        <div className="widget-camera-dialog">
          <Text variant="body-2" color="secondary">
            {t('widgetCamera.hint')}
          </Text>
          <div className="widget-camera-dialog__media">
            <video
              ref={videoRef}
              className="widget-camera-dialog__video"
              autoPlay
              playsInline
              muted
            />
            {previewUrl && (
              <img
                className="widget-camera-dialog__preview"
                src={previewUrl}
                alt={t('widgetCamera.previewAlt')}
              />
            )}
            {!isCameraActive && !previewUrl && (
              <div className="widget-camera-dialog__overlay">
                {isStarting ? (
                  <Spin size="m" />
                ) : (
                  <Text variant="body-2" color="secondary">
                    {t('widgetCamera.unavailable')}
                  </Text>
                )}
              </div>
            )}
          </div>
          <div className="widget-camera-dialog__actions">
            <Button
              view="action"
              size="l"
              onClick={() => (hasSnapshot ? void reshootPhoto() : void capturePhoto())}
              disabled={hasSnapshot ? isStarting : !isCameraActive || isStarting}
            >
              <Icon data={Camera} size={16} />
              {hasSnapshot ? t('widgetCamera.reshoot') : t('widgetCamera.shoot')}
            </Button>
            <Button
              view="normal"
              size="l"
              onClick={() => void handleUsePhoto()}
              disabled={!hasSnapshot || isSaving}
              loading={isSaving}
            >
              {t('widgetCamera.usePhoto')}
            </Button>
          </div>
          {error && (
            <Text variant="caption-2" color="danger">
              {error}
            </Text>
          )}
        </div>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onCancel}
        textButtonCancel={t('widgetCamera.cancel')}
      />
    </Dialog>
  );
}
