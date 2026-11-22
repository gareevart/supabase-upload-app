'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Button, Text, useToaster } from '@gravity-ui/uikit';
import { useAuth } from '@/app/contexts/AuthContext';
import { useI18n } from '@/app/contexts/I18nContext';
import { getBlobPreviewUrl, resolveStorageDeletePath } from '@/lib/blobUrl';
import './YandexFileUploader.css';

interface YandexFileUploaderProps {
  folderPath: string;
  onUploadComplete: (url: string) => void;
  existingFileUrl: string;
  acceptedFileTypes: string;
  maxSizeMB: number;
  allowDelete: boolean;
  onDeleteComplete?: () => void;
}

const YandexFileUploader = ({
  folderPath,
  onUploadComplete,
  existingFileUrl,
  acceptedFileTypes,
  maxSizeMB,
  allowDelete,
  onDeleteComplete
}: YandexFileUploaderProps) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Local data URL preview for a file not uploaded yet */
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { add } = useToaster();

  const hasPersistedAvatar = Boolean(existingFileUrl?.trim());
  const persistedPreviewUrl = hasPersistedAvatar ? getBlobPreviewUrl(existingFileUrl) : null;
  const displayPreviewUrl = localPreview ?? persistedPreviewUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      if (acceptedFileTypes && !selectedFile.type.match(acceptedFileTypes)) {
        setError(`Пожалуйста, выберите правильный тип файла (${acceptedFileTypes})`);
        setFile(null);
        return;
      }

      if (maxSizeMB && selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`Размер файла должен быть меньше ${maxSizeMB}MB`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);

      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      setError('Пожалуйста, выберите файл для загрузки');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folderPath);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при загрузке файла');
      }

      const uploadedUrl = result.data.directUrl || result.data.publicUrl || result.data.url;
      onUploadComplete(uploadedUrl);

      add({
        name: 'upload-success',
        title: 'Успех',
        content: 'Файл успешно загружен',
        theme: 'success',
        autoHiding: 5000,
      });

      setFile(null);
      setLocalPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка при загрузке файла';
      console.error('Upload error:', error);
      setError(message);

      add({
        name: 'upload-error',
        title: 'Ошибка',
        content: message,
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!hasPersistedAvatar || !allowDelete || !user) return;

    try {
      setUploading(true);
      setError(null);

      const filePath = resolveStorageDeletePath(existingFileUrl);

      if (!filePath) {
        throw new Error('Не удалось извлечь путь к файлу из URL');
      }

      const response = await fetch(`/api/storage/delete?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при удалении файла');
      }

      setLocalPreview(null);
      onUploadComplete('');

      if (onDeleteComplete) {
        onDeleteComplete();
      }

      add({
        name: 'delete-file-success',
        title: 'Успех',
        content: 'Файл удален',
        theme: 'success',
        autoHiding: 5000,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка при удалении файла';
      console.error('Delete error:', error);
      setError(message);

      add({
        name: 'delete-file-error',
        title: 'Ошибка',
        content: message,
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedFileLabel = file?.name ?? t('yandexFileUploader.noFileSelected');

  return (
    <div className="yandex-file-uploader">
      {displayPreviewUrl ? (
        <div className="yandex-file-uploader__preview">
          <div className="yandex-file-uploader__preview-image">
            <Image
              src={displayPreviewUrl}
              alt="Preview"
              fill
              unoptimized
              className="yandex-file-uploader__preview-img"
              sizes="80px"
            />
          </div>
          {allowDelete && hasPersistedAvatar ? (
            <Button
              size="m"
              view="outlined-danger"
              onClick={handleDelete}
              loading={uploading}
            >
              {t('yandexFileUploader.delete')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="yandex-file-uploader__row">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          disabled={uploading}
          className="yandex-file-uploader__input--visually-hidden"
          tabIndex={-1}
          aria-hidden
        />
        {file ? (
          <>
            <Button
              size="l"
              view="normal"
              onClick={handleUpload}
              loading={uploading}
            >
              {t('yandexFileUploader.upload')}
            </Button>
            <Text
              variant="body-1"
              color="primary"
              className="yandex-file-uploader__filename yandex-file-uploader__filename--pickable"
              ellipsis
              onClick={() => {
                if (!uploading) {
                  fileInputRef.current?.click();
                }
              }}
            >
              {selectedFileLabel}
            </Text>
          </>
        ) : (
          <>
            <Button
              size="l"
              view="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {t('yandexFileUploader.chooseFile')}
            </Button>
            <Text
              variant="body-1"
              color="secondary"
              className="yandex-file-uploader__filename"
              ellipsis
            >
              {selectedFileLabel}
            </Text>
          </>
        )}
      </div>

      {error && (
        <Text color="danger" variant="body-2">
          {error}
        </Text>
      )}
    </div>
  );
};

export default YandexFileUploader;