"use client";

import React from 'react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Card, Skeleton, Icon, Text } from '@gravity-ui/uikit';
import { Check } from '@gravity-ui/icons';
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/app/contexts/I18nContext";
import "./BlogEditor.css";

interface StoredImageGalleryProps {
  onImageSelect: (imageUrl: string) => void;
}

const StoredImageGallery: React.FC<StoredImageGalleryProps> = ({ onImageSelect }) => {
  const [images, setImages] = useState<Array<{ name: string; url: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch list of files from Yandex Cloud Storage via API
      // Look for images in the 'featured' folder where blog post images are stored
      const response = await fetch('/api/storage/list?prefix=featured/&bucket=public-gareevde');

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
        // Generate public URL for Yandex Cloud Storage
        // The API returns file.name as the path after the prefix (e.g., "userId/filename.jpg")
        // So we need to combine prefix + file.name to get the full path
        const publicUrl = `https://storage.yandexcloud.net/public-gareevde/featured/${file.name}`;

        return {
          name: file.name.split('/').pop() || file.name, // Extract just the filename for display
          url: publicUrl
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
  }, []); // Keep toast out of deps to avoid an infinite loop

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  if (isLoading) {
    return (
      <div className="image-gallery__skeleton">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} style={{ width: '100%', aspectRatio: '1 / 1' }} />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="image-gallery__empty">
        <Text variant="body-1" color="secondary">{t('blogEditor.galleryEmpty')}</Text>
      </div>
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
                  src={image.url}
                  alt={image.name}
                  fill
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
          </div>
        );
      })}
    </div>
  );
};

export default StoredImageGallery;
