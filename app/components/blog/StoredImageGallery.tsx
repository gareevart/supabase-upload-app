"use client";

import React from 'react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Skeleton, Icon, Text } from '@gravity-ui/uikit';
import { deleteFile } from '@/lib/yandexStorage';
import { Check } from '@gravity-ui/icons';
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/app/contexts/I18nContext";
import "./BlogEditor.css";
import { getBlobPreviewUrl } from "@/lib/blobUrl";
import { supabase } from '@/lib/supabase';

interface StoredImageGalleryProps {
  onImageSelect: (imageUrl: string) => void;
}

const StoredImageGallery: React.FC<StoredImageGalleryProps> = ({ onImageSelect }) => {
  const [images, setImages] = useState<Array<{ name: string; url: string; pathname: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [gallerySource, setGallerySource] = useState<'posts' | 'mine'>('posts');
  const { toast } = useToast();
  const { t } = useI18n();
  const sourceTabs = (
    <div className="image-gallery__tabs" role="tablist" aria-label={t('blogEditor.selectFromGallery')}>
      <Button size="m" view={gallerySource === 'posts' ? 'normal' : 'outlined'} role="tab" aria-selected={gallerySource === 'posts'} onClick={() => setGallerySource('posts')}>
        {t('blogEditor.galleryOtherPosts')}
      </Button>
      <Button size="m" view={gallerySource === 'mine' ? 'normal' : 'outlined'} role="tab" aria-selected={gallerySource === 'mine'} onClick={() => setGallerySource('mine')}>
        {t('blogEditor.galleryMyImages')}
      </Button>
    </div>
  );

  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const prefix = gallerySource === 'posts' ? 'featured/' : user ? `profiles/${user.id}/` : null;
      if (!prefix) {
        setImages([]);
        return;
      }

      const response = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}`, {
        headers: gallerySource === 'mine' && user ? { 'x-user-id': user.id } : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Filter for only image files and create URLs
      const imageFiles = result.data.filter((file: any) =>
        file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) &&
        !file.name.startsWith('.') &&
        file.name !== ''
      );

      const imageUrls = imageFiles.map((file: any) => {
        return {
          name: file.name.split('/').pop() || file.name,
          pathname: file.pathname || file.name,
          url: file.url || getBlobPreviewUrl(file.pathname) || ''
        };
      });

      setImages(imageUrls);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast({
        title: t('blogEditor.galleryLoadErrorTitle'),
        description: t('blogEditor.galleryLoadErrorText'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallerySource]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  if (isLoading) {
    return (
      <>
        {sourceTabs}
        <div className="image-gallery__skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} style={{ width: '100%', aspectRatio: '1 / 1' }} />
          ))}
        </div>
      </>
    );
  }

  if (images.length === 0) {
    return (
      <>
        {sourceTabs}
        <div className="image-gallery__empty">
          <Text variant="body-1" color="secondary">{t('blogEditor.galleryEmpty')}</Text>
        </div>
      </>
    );
  }

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    onImageSelect(imageUrl);
    toast({
      title: t('blogEditor.imageSelectedTitle'),
      description: t('blogEditor.imageSelectedText')
    });
  };

  return (
    <>
      {sourceTabs}
      <div className="image-gallery">
      {images.map((image) => {
        const isSelected = selectedImageUrl === image.url;
        return (
          <div
            key={image.name}
            className="image-gallery__item"
            onClick={() => handleImageSelect(image.url)}
          >
            <Card className={`image-gallery__card${isSelected ? ' image-gallery__card_selected' : ''}`}>
              <div className="image-gallery__thumb">
                <Image
                  src={getBlobPreviewUrl(image.url) || ''}
                  alt={image.name}
                  fill
                  unoptimized
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                />
              </div>
            </Card>
            {isSelected && (
              <div className="image-gallery__badge">
                <Icon data={Check} size={16} />
              </div>
            )}
            {gallerySource === 'mine' && <Button
              size="s"
              view="outlined-danger"
              onClick={async (event) => {
                event.stopPropagation();
                try {
                  await deleteFile(image.pathname);
                  setImages((current) => current.filter((item) => item.pathname !== image.pathname));
                  if (selectedImageUrl === image.url) setSelectedImageUrl(null);
                  toast({ title: 'Изображение удалено' });
                } catch (error) {
                  toast({
                    title: 'Не удалось удалить изображение',
                    description: error instanceof Error ? error.message : 'Попробуйте еще раз',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Удалить
            </Button>}
          </div>
        );
      })}
      </div>
    </>
  );
};

export default StoredImageGallery;
