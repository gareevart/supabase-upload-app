'use client';

import { useRef, useState } from 'react';
import '../components.css';
import { uploadFile, getPublicUrl } from '@/lib/yandexStorage';
import { supabase } from '@/lib/supabase';
import { Button, Card, Text, useToaster, Hotkey} from '@gravity-ui/uikit';
import TagSelector from './TagSelector';
import { useI18n } from '@/app/contexts/I18nContext';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toaster = useToaster();
  const { t } = useI18n();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Проверяем, что файл является изображением
      if (!selectedFile.type.startsWith('image/')) {
        setError(t('gallery.upload.error.notImage'));
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
      setError(t('gallery.upload.error.authRequired'));
      return;
    }

    if (!file) {
      setError(t('gallery.upload.error.noFile'));
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
            title: t('gallery.toast.success'),
            content: selectedTags.length > 0
              ? t('gallery.upload.successWithTags').replace('{count}', String(selectedTags.length))
              : t('gallery.upload.success'),
            theme: 'success',
            autoHiding: 5000
          });
          
          // Обновляем список файлов
          const fileUploadedEvent = new CustomEvent('fileUploaded');
          window.dispatchEvent(fileUploadedEvent);
        } catch (error) {
          setError(t('gallery.upload.error.previewUrl'));
        }
      }
    } catch (error: any) {
      // Информативное сообщение об ошибке
      const errorMessage = error.message || t('gallery.upload.error.generic');
      
      setError(errorMessage);
      
      // Показываем тост с сообщением об ошибке
      toaster.add({
        name: 'upload-error',
        title: t('gallery.toast.error'),
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
        <Text variant="body-short">{t('gallery.upload.title')}</Text>
        <div className="file-upload-field">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-upload-input sr-only"
            disabled={uploading}
          />
          <Button
            view="outlined"
            size="m"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {file ? file.name : 'Выбрать изображение'}
          </Button>
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
          {uploading ? t('gallery.upload.uploading') : t('gallery.upload.button')}
          <Hotkey view="light" value="mod+enter" />
        </Button>

        {error && <p className="file-upload-error">{error}</p>}

        {uploadedFilePath && (
          <div className="file-upload-success">
            <Text variant="body-1">{t('gallery.upload.success')}</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
