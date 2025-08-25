'use client';

import { useState } from 'react';
import Image from 'next/image';
import './components.css';
import { supabase } from '@/lib/supabase';
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
    if (!file) {
      setError('Пожалуйста, выберите изображение для загрузки');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `profiles/${fileName}`; // Добавляем префикс profiles/

      // Загружаем файл в Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars') // Используем бакет avatars
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Получаем публичную ссылку на файл
      const { data: { publicUrl } } = supabase.storage
        .from('avatars') // Используем бакет avatars
        .getPublicUrl(filePath);

      setUploadedFilePath(publicUrl);
      
      // Показываем тост с сообщением об успешной загрузке
      if (publicUrl) {
        toaster.add({
          name: 'upload-success',
          title: 'Congrats!',
          content: 'Изображение загружено',
          theme: 'success',
          autoHiding: 5000
        });
      }
    } catch (error: any) {
      // Более информативное сообщение об ошибке для проблем с RLS
      let errorMessage = '';
      if (error.message && error.message.includes('row-level security policy')) {
        errorMessage = 'Ошибка доступа: Необходимо настроить политики безопасности для бакета "avatars" в Supabase. ' +
                'Убедитесь, что бакет существует и имеет правильные настройки RLS.';
      } else {
        errorMessage = error.message || 'Произошла ошибка при загрузке изображения';
      }
      
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
     <Card type="container">
      <Text variant="header-1">Загрузка изображений</Text>
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
           <Text variant="body-1">Изображение загружено!</Text>
          <div className="file-upload-image-container" style={{ position: 'relative', width: '200px', height: '200px' }}>
            <Image
              src={uploadedFilePath}
              alt="Загруженное изображение"
              fill
              className="file-upload-image"
              style={{ objectFit: 'cover' }}
              sizes="200px"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
