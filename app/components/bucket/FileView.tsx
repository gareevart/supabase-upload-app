'use client';
import { useCallback, useEffect, useState } from 'react';
import '../components.css';
import { listFiles, deleteFile, getPublicUrl, FileObject } from '@/lib/yandexStorage';
import { supabase } from '@/lib/supabase';
import {TrashBin, Copy} from '@gravity-ui/icons';
import {Button, Icon, Card, Text, Skeleton, useToaster} from '@gravity-ui/uikit';

export default function FileView() {
  const [images, setImages] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const toaster = useToaster();

  const fetchImages = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setImages([]);
        setImageUrls({});
        setUserRole(null);
        return;
      }

      // Получаем роль пользователя
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      setUserRole(profile?.role || null);

      const { data, error } = await listFiles(`profiles/${userId}/`, 'buckets3', userId);
      if (error) throw error;
      
      const urls: Record<string, string> = {};
      for (const image of data || []) {
        try {
          const url = await getPublicUrl(`profiles/${userId}/${image.name}`);
          urls[image.name] = url;
        } catch (err) {}
      }
      
      setImages(data || []);
      setImageUrls(urls);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке списка изображений');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setError('Необходимо авторизоваться для удаления изображений');
        return;
      }
      
      // Проверяем, не пытаемся ли удалить публичное изображение
      if (fileName.startsWith('public/')) {
        setError('Нельзя удалять публичные изображения');
        return;
      }

      const { error } = await deleteFile(`profiles/${userId}/${fileName}`, userId);
      if (error) throw error;
      fetchImages();
    } catch (err: any) {
      setError(err.message || 'Ошибка при удалении изображения');
    }
  };

  const getImageUrl = (fileName: string) => {
    return imageUrls[fileName] || '';
  };

  const handleCopyUrl = async (fileName: string) => {
    const url = getImageUrl(fileName);
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        toaster.add({
          name: 'copy-success',
          title: 'Успешно!',
          content: 'Ссылка скопирована в буфер обмена',
          theme: 'success',
          autoHiding: 3000
        });
      } catch (err) {
        toaster.add({
          name: 'copy-error',
          title: 'Ошибка!',
          content: 'Не удалось скопировать ссылку',
          theme: 'danger',
          autoHiding: 3000
        });
      }
    }
  };

  const handleFileUploaded = useCallback(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      fetchImages();
    }
  }, []);

  // Слушатель события загрузки нового файла
  useEffect(() => {
    // Добавляем слушатель события
    window.addEventListener('fileUploaded', handleFileUploaded);

    // Удаляем слушатель при размонтировании компонента
    return () => {
      window.removeEventListener('fileUploaded', handleFileUploaded);
    };
  }, [handleFileUploaded]);

  // Обработчик изменения localStorage
  const handleStorageChange = useCallback(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setUserRole(null);
      setImages([]);
      setImageUrls({});
    }
  }, []);

  // Загрузка изображений при монтировании компонента
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      fetchImages();
    }

    // Добавляем слушатель изменения localStorage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  return (
    <Card view="filled">
      <div className="file-view-header">
        <Text variant="header-1">Галерея изображений</Text>
          <Button size='l' view="normal" onClick={fetchImages} loading={loading} >
            {loading ? 'Загрузка...' : 'Обновить'}
          </Button>
      </div>
      
      {error && <div className="file-view-error">{error}</div>}
      
      {loading ? (
        <div className="file-view-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="file-view-item">
              <div className="file-view-image-container">
                <Skeleton style={{ width: '100%', height: '100%', borderRadius: '9999px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="file-view-empty">
          Нет изображений в папке "profiles" бакета "buckets3"
        </div>
      ) : (
        <div className="file-view-grid">
          {images.map((image) => (
            <div 
              key={image.name} 
              className="file-view-item"
            >
              <div className="file-view-image-container">
              <img
                src={imageUrls[image.name] || ''}
                alt={image.name}
                className="file-view-image"
                onError={(e) => {
                  if (!e.currentTarget) return;
                  const img = e.currentTarget;
                  img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              </div>
              
              {/* Overlay with action buttons on hover */}
              <div className="file-view-overlay">
                <div className="file-view-buttons">
                  <Button
                    size="m"
                    view="normal-contrast"
                    title="Copy image URL"
                    onClick={() => handleCopyUrl(image.name)}
                    style={{ marginRight: '8px' }}
                  >
                    <Icon data={Copy} size={18} />
                  </Button>
                  {!image.name.startsWith('public/') && (
                    <Button
                      size="m"
                      view="normal-contrast"
                      title="Delete image"
                      onClick={() => handleDelete(image.name)}
                    >
                      <Icon data={TrashBin} size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
