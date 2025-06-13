'use client';

import { useState } from 'react';
import '../components.css';
import { uploadFile, getPublicUrl } from '@/lib/yandexStorage';
import { Button, Card, Text, useToaster } from '@gravity-ui/uikit';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toaster = useToaster();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Проверяем, что файл является изображением
      if (!selectedFile.type.startsWith('image/')) {
        setError('Пожалуйста, выберите изображение (JPEG, PNG, GIF и т.д.)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setError('Для загрузки файлов необходимо авторизоваться');
      return;
    }

    if (!file) {
      setError('Пожалуйста, выберите изображение для загрузки');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const { error: uploadError, data } = await uploadFile(
        file, 
        `profiles/${userId}`,
        userId
      );
      if (uploadError) {
          throw uploadError;
      }

      if (uploadError) {
        throw uploadError;
      }

      if (data && data.path) {
        try {
          const url = await getPublicUrl(data.path);
          setUploadedFilePath(url);
          
          // Показываем тост с сообщением об успешной загрузке
          toaster.add({
            name: 'upload-success',
            title: 'Успешно!',
            content: 'Изображение загружено',
            theme: 'success',
            autoHiding: 5000
          });
          
          // Обновляем список файлов
          const fileUploadedEvent = new CustomEvent('fileUploaded');
          window.dispatchEvent(fileUploadedEvent);
        } catch (error) {
          setError('Не удалось получить URL для превью');
        }
      }
    } catch (error: any) {
      // Информативное сообщение об ошибке
      const errorMessage = error.message || 'Произошла ошибка при загрузке изображения';
      
      setError(errorMessage);
      
      // Показываем тост с сообщением об ошибке
      toaster.add({
        name: 'upload-error',
        title: 'Ошибка!',
        content: errorMessage,
        theme: 'danger',
        autoHiding: 10000
      });
    } finally {
      setUploading(false);
    }
  };

  return (
     <Card view="filled">
      <Text variant="body-short">Загрузка изображений</Text>
      <div className="file-upload-field">
      <input
          type="file"
          accept="image/*" // Принимаем только изображения
          onChange={handleFileChange}
          className="file-upload-input"
          disabled={uploading}
        />
      </div>
      <Button size='l' view="action" onClick={handleUpload}
        disabled={uploading || !file}>
        {uploading ? 'Загрузка...' : 'Загрузить изображение'}
      </Button>

      {error && <p className="file-upload-error">{error}</p>}

      {uploadedFilePath && (
        <div className="file-upload-success">
          <Text variant="body-1">Изображение загружено</Text>
        </div>
      )}
    </Card>
  );
}
