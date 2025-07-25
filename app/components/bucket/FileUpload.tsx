'use client';

import { useState } from 'react';
import '../components.css';
import { uploadFile, getPublicUrl } from '@/lib/yandexStorage';
import { supabase } from '@/lib/supabase';
import { Button, Card, Text, useToaster, Hotkey} from '@gravity-ui/uikit';
import TagSelector from './TagSelector';

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
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

      // Загружаем файл в хранилище
      const { error: uploadError, data } = await uploadFile(
        file, 
        `profiles/${userId}`,
        userId
      );
      if (uploadError) {
          throw uploadError;
      }

      if (data && data.path) {
        try {
          const url = await getPublicUrl(data.path);
          
          // Сохраняем информацию об изображении в базу данных
          const { data: imageData, error: imageError } = await supabase
            .from('images')
            .insert([{
              user_id: userId,
              file_name: file.name,
              file_path: data.path,
              file_size: file.size,
              mime_type: file.type,
              public_url: url
            }])
            .select()
            .single();

          if (imageError) {
            console.error('Ошибка сохранения информации об изображении:', imageError);
            // Не прерываем процесс, если не удалось сохранить метаданные
          }

          // Если есть выбранные теги и изображение успешно сохранено, связываем их
          if (selectedTags.length > 0 && imageData) {
            const tagLinks = selectedTags.map(tag => ({
              image_id: imageData.id,
              tag_id: tag.id
            }));

            const { error: tagsError } = await supabase
              .from('image_tags')
              .insert(tagLinks);

            if (tagsError) {
              console.error('Ошибка сохранения тегов:', tagsError);
              // Не прерываем процесс, если не удалось сохранить теги
            }
          }

          setUploadedFilePath(url);
          
          // Сбрасываем состояние после успешной загрузки
          setFile(null);
          setSelectedTags([]);
          
          // Сбрасываем значение input
          const fileInput = document.querySelector('.file-upload-input') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          // Показываем тост с сообщением об успешной загрузке
          toaster.add({
            name: 'upload-success',
            title: 'Успешно!',
            content: selectedTags.length > 0 
              ? `Изображение загружено с ${selectedTags.length} тегами`
              : 'Изображение загружено',
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
    <div>
      <Card view="filled" className='responsive-card'>
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
        
        {/* Показываем селектор тегов только если файл выбран */}
        {file && (
          <TagSelector
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            disabled={uploading}
          />
        )}
        
        <Button size='l' view="action" onClick={handleUpload}
          disabled={uploading || !file}>
          {uploading ? 'Загрузка...' : 'Загрузить изображение'}
          <Hotkey view="light" value="mod+enter" />
        </Button>

        {error && <p className="file-upload-error">{error}</p>}

        {uploadedFilePath && (
          <div className="file-upload-success">
            <Text variant="body-1">Изображение загружено</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
