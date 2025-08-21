'use client';
import { useEffect, useState } from 'react';
import './components.css';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {Button, Card, Text, Skeleton} from '@gravity-ui/uikit';

interface FileObject {
  name: string;
  id?: string;
  metadata?: { size?: number };
  created_at?: string;
}

export default function FileView() {
  const [images, setImages] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);

      // Получаем изображения из папки profiles в бакете avatars
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .list('profiles', {
          limit: 100,
          offset: 0,
        });

      if (error) throw error;
      
      // Фильтруем служебный файл .emptyFolderPlaceholder, который Supabase создает автоматически
      const filteredData = data ? data.filter(file => file.name !== ".emptyFolderPlaceholder") : [];
      setImages(filteredData);
    } catch (err: any) {
      // Более информативное сообщение об ошибке для проблем с RLS
      if (err.message && err.message.includes('row-level security policy')) {
        setError('Ошибка доступа: Необходимо настроить политики безопасности для бакета "avatars" в Supabase. ' +
                'Убедитесь, что бакет существует и имеет правильные настройки RLS.');
      } else {
        setError(err.message || 'Ошибка при загрузке списка изображений');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase
        .storage
        .from('avatars')
        .remove([`profiles/${fileName}`]);
      
      if (error) throw error;
      fetchImages();
    } catch (err: any) {
      // Более информативное сообщение об ошибке для проблем с RLS
      if (err.message && err.message.includes('row-level security policy')) {
        setError('Ошибка доступа: Необходимо настроить политики безопасности для бакета "avatars" в Supabase для удаления файлов.');
      } else {
        setError(err.message || 'Ошибка при удалении изображения');
      }
    }
  };

  const getImageUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(`profiles/${fileName}`);
    return data.publicUrl;
  };

  useEffect(() => { fetchImages(); }, []);

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
          Нет изображений в папке {'"profiles"'} бакета {'"avatars"'}
        </div>
      ) : (
        <div className="file-view-grid">
          {images.map((image) => (
            <div 
              key={image.name} 
              className="file-view-item"
            >
              <div className="file-view-image-container">
                <Image
                  src={getImageUrl(image.name)}
                  alt={image.name}
                  className="file-view-image"
                  width={100}
                  height={100}
                />
              </div>
              
              {/* Overlay with delete icon on hover */}
              <div className="file-view-overlay">
                <button
                  onClick={() => handleDelete(image.name)}
                  className="file-view-delete-button"
                  title="Удалить изображение"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="file-view-delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
