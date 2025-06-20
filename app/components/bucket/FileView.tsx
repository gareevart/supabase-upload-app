'use client';
import { useCallback, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import '../components.css';
import { listFiles, deleteFile, getPublicUrl, FileObject } from '@/lib/yandexStorage';
import { supabase } from '@/lib/supabase';
import { TrashBin, Copy } from '@gravity-ui/icons';
import { Button, Icon, Card, Text, Skeleton, useToaster } from '@gravity-ui/uikit';

interface FileViewState {
  images: FileObject[];
  loading: boolean;
  error: string | null;
  imageUrls: Record<string, string>;
  userRole: string | null;
}

export default function FileView() {
  const [state, setState] = useState<FileViewState>({
    images: [],
    loading: true,
    error: null,
    imageUrls: {},
    userRole: null,
  });

  const toaster = useToaster();

  // Получаем userId безопасно
  const [userId, setUserId] = useState<string | null>(null);
  
  // Кэш для URL изображений
  const urlCache = useMemo(() => new Map<string, string>(), []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('user_id');
      setUserId(id);
    }
  }, []);

  // Функция для безопасного обновления состояния
  const updateState = useCallback((updates: Partial<FileViewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Функция для показа уведомлений
  const showToast = useCallback((type: 'success' | 'error', title: string, content: string) => {
    toaster.add({
      name: `${type}-${Date.now()}`,
      title,
      content,
      theme: type === 'success' ? 'success' : 'danger',
      autoHiding: 3000
    });
  }, [toaster]);

  const fetchImages = useCallback(async () => {
    if (!userId) {
      updateState({
        images: [],
        imageUrls: {},
        userRole: null,
        loading: false,
        error: null
      });
      return;
    }

    try {
      updateState({ loading: true, error: null });

      // Параллельно получаем роль пользователя и список файлов
      const [profileResult, filesResult] = await Promise.allSettled([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single(),
        listFiles(`profiles/${userId}/`, 'public-gareevde', userId)
      ]);

      // Обрабатываем результат получения профиля
      const userRole = profileResult.status === 'fulfilled' 
        ? profileResult.value.data?.role || null 
        : null;

      // Обрабатываем результат получения файлов
      if (filesResult.status === 'rejected') {
        throw new Error(filesResult.reason?.message || 'Ошибка при загрузке файлов');
      }

      const { data: files, error: filesError } = filesResult.value;
      if (filesError) throw new Error(typeof filesError === 'string' ? filesError : 'Ошибка при загрузке файлов');

      const images = files || [];

      // Параллельно получаем URL для всех изображений с кэшированием
      const urlPromises = images.map(async (image: FileObject) => {
        const cacheKey = `${userId}/${image.name}`;
        
        // Проверяем кэш
        if (urlCache.has(cacheKey)) {
          return { name: image.name, url: urlCache.get(cacheKey)! };
        }
        
        try {
          const url = await getPublicUrl(`profiles/${userId}/${image.name}`);
          // Сохраняем в кэш
          urlCache.set(cacheKey, url);
          return { name: image.name, url };
        } catch {
          return { name: image.name, url: '' };
        }
      });

      const urlResults = await Promise.allSettled(urlPromises);
      const imageUrls: Record<string, string> = {};
      
      urlResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          imageUrls[result.value.name] = result.value.url;
        }
      });

      updateState({
        images,
        imageUrls,
        userRole,
        loading: false,
        error: null
      });

    } catch (err: any) {
      console.error('Error fetching images:', err);
      updateState({
        loading: false,
        error: err.message || 'Ошибка при загрузке списка изображений'
      });
    }
  }, [userId, updateState]);

  const handleDelete = useCallback(async (fileName: string) => {
    if (!userId) {
      updateState({ error: 'Необходимо авторизоваться для удаления изображений' });
      return;
    }
    
    if (fileName.startsWith('public/')) {
      updateState({ error: 'Нельзя удалять публичные изображения' });
      return;
    }

    try {
      const { error } = await deleteFile(`profiles/${userId}/${fileName}`, userId);
      if (error) throw new Error(typeof error === 'string' ? error : 'Ошибка при удалении файла');
      
      showToast('success', 'Успешно!', 'Изображение удалено');
      await fetchImages(); // Обновляем список после удаления
    } catch (err: any) {
      console.error('Error deleting file:', err);
      const errorMessage = err.message || 'Ошибка при удалении изображения';
      updateState({ error: errorMessage });
      showToast('error', 'Ошибка!', errorMessage);
    }
  }, [userId, updateState, showToast, fetchImages]);

  const handleCopyUrl = useCallback(async (fileName: string) => {
    const url = state.imageUrls[fileName];
    if (!url) {
      showToast('error', 'Ошибка!', 'URL изображения не найден');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('success', 'Успешно!', 'Ссылка скопирована в буфер обмена');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      showToast('error', 'Ошибка!', 'Не удалось скопировать ссылку');
    }
  }, [state.imageUrls, showToast]);

  const handleFileUploaded = useCallback(() => {
    if (userId) {
      fetchImages();
    }
  }, [userId, fetchImages]);

  // Обработчик изменения localStorage
  const handleStorageChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentUserId = localStorage.getItem('user_id');
      if (!currentUserId) {
        setUserId(null);
        updateState({
          userRole: null,
          images: [],
          imageUrls: {},
          loading: false,
          error: null
        });
      } else if (currentUserId !== userId) {
        setUserId(currentUserId);
        // Перезагружаем данные при смене пользователя
        fetchImages();
      }
    }
  }, [userId, updateState, fetchImages]);

  // Эффект для загрузки данных при монтировании
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Эффект для слушателей событий
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('fileUploaded', handleFileUploaded);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('fileUploaded', handleFileUploaded);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleFileUploaded, handleStorageChange]);

  // Сброс ошибки через некоторое время
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        updateState({ error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error, updateState]);

  const renderSkeletons = () => (
    <div className="file-view-grid">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={`skeleton-${index}`} className="file-view-item">
          <div className="file-view-image-container">
            <Skeleton style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderImageGrid = () => (
    <div className="file-view-grid">
      {state.images.map((image) => (
        <div key={image.name} className="file-view-item">
          <div className="file-view-image-container">
            <Image
              src={state.imageUrls[image.name] || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg=='}
              alt={image.name}
              fill
              sizes="100px"
              className="file-view-image"
              style={{ objectFit: 'cover' }}
              priority={false}
              loading="lazy"
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
          
          <div className="file-view-overlay">
            <div className="file-view-buttons">
              <Button
                size="m"
                view="normal-contrast"
                title="Скопировать URL изображения"
                onClick={() => handleCopyUrl(image.name)}
                style={{ marginRight: '8px' }}
              >
                <Icon data={Copy} size={18} />
              </Button>
              {!image.name.startsWith('public/') && (
                <Button
                  size="m"
                  view="normal-contrast"
                  title="Удалить изображение"
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
  );

  return (
    <Card type="container">
      <div className="file-view-header">
        <Text variant="header-1">Галерея изображений</Text>
        <Button 
          size="l" 
          view="normal" 
          onClick={fetchImages} 
          loading={state.loading}
          disabled={state.loading}
        >
          {state.loading ? 'Загрузка...' : 'Обновить'}
        </Button>
      </div>
      
      {state.error && (
        <div className="file-view-error" role="alert">
          {state.error}
        </div>
      )}
      
      {state.loading ? (
        renderSkeletons()
      ) : state.images.length === 0 ? (
        <div className="file-view-empty">
          {userId 
            ? 'Нет изображений в вашей галерее'
            : 'Необходимо авторизоваться для просмотра галереи'
          }
        </div>
      ) : (
        renderImageGrid()
      )}
    </Card>
  );
}
