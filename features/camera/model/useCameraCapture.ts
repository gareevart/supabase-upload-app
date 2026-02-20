"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToaster } from "@gravity-ui/uikit";
import { uploadFile, getPublicUrl } from "@/lib/yandexStorage";
import { supabase } from "@/lib/supabase";

type CameraCaptureOptions = {
  quality?: number;
  imageType?: "image/jpeg" | "image/png" | "image/webp";
};

const DEFAULT_OPTIONS: Required<CameraCaptureOptions> = {
  quality: 0.92,
  imageType: "image/jpeg",
};

export function useCameraCapture(options?: CameraCaptureOptions) {
  const resolvedOptions = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options],
  );

  const toaster = useToaster();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playVideoSafely = useCallback(async (video: HTMLVideoElement) => {
    try {
      await video.play();
    } catch (playError) {
      // Happens when a new source is attached before the previous play settles.
      // This is harmless for our use case and should not surface as an error.
      if (playError instanceof DOMException && playError.name === "AbortError") {
        return;
      }
      throw playError;
    }
  }, []);

  const stopCamera = useCallback(() => {
    isStartingRef.current = false;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsStarting(false);
  }, []);

  const clearSnapshot = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (isStartingRef.current) {
      return;
    }

    // Reuse an already opened stream to avoid visual flashes.
    if (streamRef.current) {
      const video = videoRef.current;
      if (video && video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        try {
          await playVideoSafely(video);
        } catch (playError) {
          console.error("Failed to resume existing camera stream", playError);
        }
      }
      setIsCameraActive(true);
      setIsStarting(false);
      setError(null);
      return;
    }

    try {
      isStartingRef.current = true;
      setIsStarting(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;

      if (!video) {
        throw new Error("Не удалось инициализировать видеоэлемент");
      }

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      await playVideoSafely(video);
      setIsCameraActive(true);
    } catch (streamError) {
      console.error("Failed to start camera", streamError);
      setIsCameraActive(false);
      setError("Не удалось получить доступ к веб-камере");
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }, [playVideoSafely]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;

    if (!video || !isCameraActive) {
      setError("Камера не активна");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError("Видео еще не готово. Попробуйте снова.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Не удалось подготовить снимок");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (nextBlob) => resolve(nextBlob),
        resolvedOptions.imageType,
        resolvedOptions.quality,
      );
    });

    if (!blob) {
      setError("Не удалось сохранить кадр");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(blob);
    previewUrlRef.current = nextPreviewUrl;

    setCapturedBlob(blob);
    setPreviewUrl(nextPreviewUrl);
    setError(null);
  }, [isCameraActive, resolvedOptions.imageType, resolvedOptions.quality]);

  const savePhoto = useCallback(async () => {
    if (!capturedBlob) {
      setError("Сначала сделайте снимок");
      return;
    }

    const userId = window.localStorage.getItem("user_id");
    if (!userId) {
      setError("Для сохранения необходимо авторизоваться");
      return;
    }

    const extension = resolvedOptions.imageType.split("/")[1] ?? "jpg";
    const file = new File(
      [capturedBlob],
      `camera-${Date.now()}.${extension}`,
      { type: resolvedOptions.imageType },
    );

    try {
      setIsSaving(true);
      setError(null);

      const { data, error: uploadError } = await uploadFile(
        file,
        `profiles/${userId}`,
        userId,
      );

      if (uploadError || !data?.path) {
        throw uploadError ?? new Error("Ошибка загрузки файла");
      }

      const url = await getPublicUrl(data.path);

      const { error: imageError } = await supabase.from("images").insert([
        {
          user_id: userId,
          file_name: file.name,
          file_path: data.path,
          file_size: file.size,
          mime_type: file.type,
          public_url: url,
        },
      ]);

      if (imageError) {
        console.error("Ошибка сохранения метаданных изображения", imageError);
      }

      window.dispatchEvent(new CustomEvent("fileUploaded"));
      clearSnapshot();
      toaster.add({
        name: "camera-upload-success",
        title: "Готово",
        content: "Фото сохранено в вашу галерею",
        theme: "success",
        autoHiding: 4000,
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить фото";
      setError(message);
      toaster.add({
        name: "camera-upload-error",
        title: "Ошибка",
        content: message,
        theme: "danger",
        autoHiding: 6000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    capturedBlob,
    clearSnapshot,
    resolvedOptions.imageType,
    toaster,
  ]);

  const reshootPhoto = useCallback(async () => {
    clearSnapshot();
    await startCamera();
  }, [clearSnapshot, startCamera]);

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [startCamera, stopCamera]);

  return {
    videoRef,
    previewUrl,
    isCameraActive,
    isStarting,
    isSaving,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    reshootPhoto,
    savePhoto,
    hasSnapshot: Boolean(capturedBlob),
  };
}
