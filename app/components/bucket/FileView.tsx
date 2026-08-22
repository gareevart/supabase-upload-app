'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import '../components.css';
import { listFiles, deleteFile, FileObject } from '@/lib/yandexStorage';
import { supabase } from '@/lib/supabase';
import { TrashBin, Copy } from '@gravity-ui/icons';
import {
  Button,
  Icon,
  Card,
  Text,
  Skeleton,
  useToaster,
  usePortalContainer,
  Pagination,
  Select,
} from '@gravity-ui/uikit';
import {
  Gallery,
  GalleryItem,
  getGalleryItemImage,
  getGalleryItemCopyLinkAction,
} from '@gravity-ui/components';
import { useI18n } from '@/app/contexts/I18nContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ImageWithTags extends FileObject {
  id?: string;
  tags?: Tag[];
}

interface FileViewState {
  images: ImageWithTags[];
  loading: boolean;
  error: string | null;
  imageUrls: Record<string, string>;
  userRole: string | null;
}

const BLOB_STORE_NAME = 'gareev-blob';
const PAGINATION_THRESHOLD = 30;
const PAGE_SIZE_OPTIONS = [30, 50, 100] as const;

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function getGridColumnCount(windowWidth: number): number {
  if (windowWidth >= 1024) {
    return 6;
  }

  if (windowWidth >= 768) {
    return 4;
  }

  if (windowWidth >= 640) {
    return 3;
  }

  return 2;
}

export default function FileView() {
  const [state, setState] = useState<FileViewState>({
    images: [],
    loading: true,
    error: null,
    imageUrls: {},
    userRole: null,
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(30);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);
  const gridCellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const toaster = useToaster();
  const container = usePortalContainer();
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const totalImages = state.images.length;
  const showPagination = totalImages > PAGINATION_THRESHOLD;
  const totalPages = Math.max(1, Math.ceil(totalImages / pageSize));

  const paginatedImages = useMemo(() => {
    if (!showPagination) {
      return state.images;
    }

    const start = (currentPage - 1) * pageSize;
    return state.images.slice(start, start + pageSize);
  }, [state.images, currentPage, pageSize, showPagination]);

  const pageOffset = showPagination ? (currentPage - 1) * pageSize : 0;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setFocusedGridIndex(0);
    gridCellRefs.current = [];
  }, [currentPage, pageSize, paginatedImages.length]);

  // Получаем userId безопасно
  const [userId, setUserId] = useState<string | null>(null);
  
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

      // Параллельно получаем роль пользователя, список файлов и информацию об изображениях из БД
      const [profileResult, filesResult, dbImagesResult] = await Promise.allSettled([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single(),
        listFiles(`profiles/${userId}/`, BLOB_STORE_NAME, userId),
        supabase
          .from('images')
          .select(`
            id,
            file_name,
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
      ]);

      // Обрабатываем результат получения профиля
      const userRole = profileResult.status === 'fulfilled' 
        ? profileResult.value.data?.role || null 
        : null;

      // Обрабатываем результат получения файлов
      if (filesResult.status === 'rejected') {
        throw new Error(filesResult.reason?.message || t('gallery.fileView.error.loadFiles'));
      }

      const { data: files, error: filesError } = filesResult.value;
      if (filesError) throw new Error(typeof filesError === 'string' ? filesError : t('gallery.fileView.error.loadFiles'));

      // Обрабатываем результат получения данных из БД
      const dbImages = dbImagesResult.status === 'fulfilled' 
        ? dbImagesResult.value.data || [] 
        : [];

      // Создаем карту тегов для каждого изображения
      const imageTagsMap: Record<string, { id: string; tags: Tag[] }> = {};
      dbImages.forEach((dbImage: any) => {
        const tags = dbImage.image_tags?.map((it: any) => it.tags).filter(Boolean) || [];
        imageTagsMap[dbImage.file_name] = {
          id: dbImage.id,
          tags
        };
      });

      // Объединяем данные из файлового хранилища с данными из БД
      const imagesWithTags: ImageWithTags[] = (files || []).map((file: FileObject) => ({
        ...file,
        id: imageTagsMap[file.name]?.id,
        tags: imageTagsMap[file.name]?.tags || []
      }));

      const imageUrlEntries = imagesWithTags.map((image) => [
        image.name,
        image.url || `/api/storage/file?path=${encodeURIComponent(image.pathname || `profiles/${userId}/${image.name}`)}`,
      ] as const);
      const imageUrls = Object.fromEntries(imageUrlEntries);

      updateState({
        images: imagesWithTags,
        imageUrls,
        userRole,
        loading: false,
        error: null
      });

    } catch (err: any) {
      console.error('Error fetching images:', err);
      updateState({
        loading: false,
        error: err.message || t('gallery.fileView.error.loadList')
      });
    }
  }, [userId, updateState, t]);

  const handleDelete = useCallback(async (fileName: string) => {
    if (!userId) {
      updateState({ error: t('gallery.fileView.error.authRequiredDelete') });
      return;
    }
    
    if (fileName.startsWith('public/')) {
      updateState({ error: t('gallery.fileView.error.publicDelete') });
      return;
    }

    try {
      // Сначала удаляем запись из базы данных (это автоматически удалит связанные теги благодаря CASCADE)
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('user_id', userId)
        .eq('file_name', fileName);

      if (dbError) {
        console.error('Ошибка удаления из БД:', dbError);
        // Не прерываем процесс, если не удалось удалить из БД
      }

      // Затем удаляем файл из хранилища
      const { error } = await deleteFile(`profiles/${userId}/${fileName}`, userId);
      if (error) throw new Error(typeof error === 'string' ? error : t('gallery.fileView.error.deleteFile'));
      
      showToast('success', t('gallery.toast.success'), t('gallery.toast.imageDeleted'));
      await fetchImages(); // Обновляем список после удаления
    } catch (err: any) {
      console.error('Error deleting file:', err);
      const errorMessage = err.message || t('gallery.fileView.error.deleteImage');
      updateState({ error: errorMessage });
      showToast('error', t('gallery.toast.error'), errorMessage);
    }
  }, [userId, updateState, showToast, fetchImages, t]);

  const handleCopyUrl = useCallback(async (fileName: string) => {
    const url = state.imageUrls[fileName];
    if (!url) {
      showToast('error', t('gallery.toast.error'), t('gallery.fileView.error.urlNotFound'));
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('success', t('gallery.toast.success'), t('gallery.toast.linkCopied'));
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      showToast('error', t('gallery.toast.error'), t('gallery.fileView.error.copyFailed'));
    }
  }, [state.imageUrls, showToast, t]);

  const handleOpenGallery = useCallback((index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }, []);

  const handleGalleryOpenChange = useCallback((open: boolean) => {
    setGalleryOpen(open);
  }, []);

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
            <Skeleton className="file-view-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );

  const handlePageSizeChange = useCallback((value: string[]) => {
    const nextPageSize = Number(value[0]);

    if (!PAGE_SIZE_OPTIONS.includes(nextPageSize as PageSize)) {
      return;
    }

    setPageSize(nextPageSize as PageSize);
    setCurrentPage(1);
  }, []);

  const focusGridCell = useCallback((index: number) => {
    setFocusedGridIndex(index);
    gridCellRefs.current[index]?.focus();
  }, []);

  const handleGridKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const itemCount = paginatedImages.length;

    if (itemCount === 0) {
      return;
    }

    const columns = typeof window !== 'undefined'
      ? getGridColumnCount(window.innerWidth)
      : 2;

    let nextIndex = focusedGridIndex;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(focusedGridIndex + 1, itemCount - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(focusedGridIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(focusedGridIndex + columns, itemCount - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(focusedGridIndex - columns, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = itemCount - 1;
        break;
      default:
        return;
    }

    if (nextIndex === focusedGridIndex) {
      return;
    }

    event.preventDefault();
    focusGridCell(nextIndex);
  }, [focusedGridIndex, paginatedImages.length, focusGridCell]);

  const renderImageGrid = () => (
    <div
      className="file-view-grid"
      role="grid"
      aria-label={t('gallery.fileView.gridLabel')}
      onKeyDown={handleGridKeyDown}
    >
      {paginatedImages.map((image, index) => (
        <div key={image.name} className="file-view-item" role="row">
          <button
            type="button"
            className="file-view-item__open"
            role="gridcell"
            tabIndex={0}
            ref={(element) => {
              gridCellRefs.current[index] = element;
            }}
            onFocus={() => setFocusedGridIndex(index)}
            onClick={() => handleOpenGallery(pageOffset + index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleOpenGallery(pageOffset + index);
              }
            }}
            aria-label={t('gallery.fileView.openImage').replace('{name}', image.name)}
          >
            <div className="file-view-image-container">
              <Image
                src={state.imageUrls[image.name] || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2Ugbm90IGZvdW5kPC90ZXh0Pjwvc3ZnPg=='}
                alt=""
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
          </button>

          <div className="file-view-overlay">
            <div className="file-view-buttons">
              <Button
                size="m"
                view="normal-contrast"
                title={t('gallery.fileView.copyUrlTitle')}
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  handleCopyUrl(image.name);
                }}
                style={{ marginRight: '8px' }}
              >
                <Icon data={Copy} size={18} />
              </Button>
              {!image.name.startsWith('public/') && (
                <Button
                  size="m"
                  view="normal-contrast"
                  title={t('gallery.fileView.deleteTitle')}
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(image.name);
                  }}
                >
                  <Icon data={TrashBin} size={18} />
                </Button>
              )}
            </div>
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
  );

  return (
    <Card type="container" className='responsive-card'>
      <div className="file-view-header">
        <Text variant="header-1">{t('gallery.fileView.title')}</Text>
        <Button 
          size="l" 
          view="normal" 
          onClick={fetchImages} 
          loading={state.loading}
          disabled={state.loading}
        >
          {state.loading ? t('gallery.fileView.loading') : t('gallery.fileView.refresh')}
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
            ? t('gallery.fileView.empty')
            : t('gallery.fileView.emptyUnauthorized')
          }
        </div>
      ) : (
        <>
          {renderImageGrid()}
          {showPagination && (
            <div className="file-view-pagination">
              <div className="file-view-pagination__size">
                <Text variant="body-2" color="secondary">
                  {t('gallery.fileView.pageSize')}
                </Text>
                <Select
                  size="m"
                  value={[String(pageSize)]}
                  onUpdate={handlePageSizeChange}
                  options={PAGE_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    content: String(size),
                  }))}
                  width={88}
                />
              </div>
              <div className="file-view-pagination__controls">
                <Pagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={totalImages}
                  onUpdate={setCurrentPage}
                  compact={isMobile}
                />
              </div>
            </div>
          )}
        </>
      )}

      {galleryOpen && (
        <Gallery
          key={galleryIndex}
          open={galleryOpen}
          onOpenChange={handleGalleryOpenChange}
          initialItemIndex={galleryIndex}
          container={container || undefined}
          emptyMessage={t('gallery.fileView.modalEmpty')}
        >
          {state.images.map((image) => {
            const imageUrl = state.imageUrls[image.name];

            return (
              <GalleryItem
                key={image.name}
                {...getGalleryItemImage({
                  src: imageUrl,
                  name: image.name,
                })}
                actions={imageUrl ? [
                  getGalleryItemCopyLinkAction({
                    copyUrl: imageUrl,
                    onCopy: () => showToast('success', t('gallery.toast.success'), t('gallery.toast.linkCopied')),
                  }),
                ] : undefined}
              />
            );
          })}
        </Gallery>
      )}
    </Card>
  );
}
