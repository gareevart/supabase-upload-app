"use client"
import { useState, useEffect, useCallback } from 'react';
import { Text, TextInput, Card, Button, Skeleton, Icon, Label } from '@gravity-ui/uikit';
import { Magnifier, Tag as TagIcon } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import './components.css';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ImageResult {
  id: string;
  file_name: string;
  public_url: string | null;
  created_at: string;
  tags: Tag[];
}

interface ImageSearchComponentProps {
  userId: string | null;
  className?: string;
}

export default function ImageSearchComponent({ userId, className = "" }: ImageSearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Загрузка доступных тегов
  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Ошибка загрузки тегов:', error);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const performSearch = useCallback(async (query: string, tagIds: string[]) => {
    if (!userId) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    if (!query.trim() && tagIds.length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      let queryBuilder = supabase
        .from('images')
        .select(`
          id,
          file_name,
          public_url,
          created_at,
          image_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Если есть поиск по названию файла
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('file_name', `%${query}%`);
      }

      const { data: images, error } = await queryBuilder;

      if (error) throw error;

      let filteredImages = images || [];

      // Фильтрация по тегам
      if (tagIds.length > 0) {
        filteredImages = filteredImages.filter(image => {
          const imageTags = image.image_tags?.map((it: any) => it.tag_id) || [];
          return tagIds.some(tagId => imageTags.includes(tagId));
        });
      }

      // Преобразуем данные в нужный формат
      const results: ImageResult[] = filteredImages.map(image => ({
        id: image.id,
        file_name: image.file_name,
        public_url: image.public_url,
        created_at: image.created_at,
        tags: image.image_tags?.map((it: any) => it.tags).filter(Boolean) || []
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Ошибка поиска изображений:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, selectedTagIds);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTagIds, performSearch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
  };

  if (!userId) {
    return (
      <Card className="w-full text-center p-8">
        <Text variant="subheader-1" className="mb-2">
          Authorization required
        </Text>
        <Text variant="body-1" color="secondary">
          Enter the system to search for your images
        </Text>
      </Card>
    );
  }

  return (
    <div className={`search-container ${className}`}>
      {/* Поиск по названию файла */}
      <TextInput
        size="l"
        hasClear={true}
        placeholder="Поиск по названию файла..."
        value={searchQuery}
        onUpdate={setSearchQuery}
        startContent={<Icon data={Magnifier} size={20} className='search-left-icon'/>}
      />

      {/* Фильтр по тегам */}
      <Card view="outlined" className="mt-4 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon data={TagIcon} size={16} />
          <Text variant="subheader-2">Фильтр по тегам</Text>
          {selectedTagIds.length > 0 && (
            <Button view="flat" size="s" onClick={clearFilters}>
              Очистить
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <Label
                key={tag.id}
                theme={isSelected ? 'success' : 'normal'}
                type={isSelected ? 'close' : 'default'}
                interactive={!isSelected}
                onClick={!isSelected ? () => handleTagToggle(tag.id) : undefined}
                onCloseClick={isSelected ? () => handleTagToggle(tag.id) : undefined}
                className={`cursor-pointer ${isSelected ? 'selected-label' : ''}`}
                size="s"
              >
                {tag.name}
              </Label>
            );
          })}
        </div>
        
        {selectedTagIds.length > 0 && (
          <div className="mt-3">
            <Text variant="caption-2" color="secondary">
              Выбрано тегов: {selectedTagIds.length}
            </Text>
          </div>
        )}
      </Card>

      <div className="search-results-container">
        {isLoading && (
          <div className="file-view-grid mt-6">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={`skeleton-${index}`} className="file-view-item">
                <div className="file-view-image-container">
                  <Skeleton style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && hasSearched && searchResults.length === 0 && (
          <Card className="w-full text-center p-8 mt-6">
            <Text variant="subheader-1" className="mb-2">
              Изображения не найдены
            </Text>
            <Text variant="body-1" color="secondary">
              Попробуйте изменить поисковый запрос или выбрать другие теги
            </Text>
          </Card>
        )}

        {!isLoading && !hasSearched && (
          <Card className="w-full text-center p-8 mt-6">
            <Text variant="subheader-1" className="mb-2">
              Поиск изображений
            </Text>
            <Text variant="body-1" color="secondary">
              Введите название файла или выберите теги для поиска среди ваших изображений
            </Text>
          </Card>
        )}

        {!isLoading && searchResults.length > 0 && (
          <div className="mt-6">
            <Text variant="subheader-1" className="mb-4">
              Найдено изображений: {searchResults.length}
            </Text>
            
            <div className="file-view-grid">
              {searchResults.map((image) => (
                <div key={image.id} className="file-view-item">
                  <div className="file-view-image-container">
                    <Image
                      src={image.public_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg=='}
                      alt={image.file_name}
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
                  
                  {/* Информация об изображении */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                    <div className="truncate font-medium">{image.file_name}</div>
                    <div className="text-xs opacity-75">{formatDate(image.created_at)}</div>
                  </div>
                  
                  {/* Отображение тегов */}
                  {image.tags && image.tags.length > 0 && (
                    <div className="file-view-tags">
                      {image.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="file-view-tag"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
