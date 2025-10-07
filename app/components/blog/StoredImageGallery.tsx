
import React from 'react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Card, Skeleton } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";

interface StoredImageGalleryProps {
  onImageSelect: (imageUrl: string) => void;
}

const StoredImageGallery: React.FC<StoredImageGalleryProps> = ({ onImageSelect }) => {
  const [images, setImages] = useState<Array<{ name: string; url: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

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
      // Используем toast напрямую без зависимости
      toast({
        title: "Ошибка загрузки изображений",
        description: "Не удалось загрузить галерею изображений",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Включаем toast в зависимости

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '16px',
        padding: '8px'
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} style={{ aspectRatio: '1', width: '100%' }} />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <p>Нет доступных изображений в хранилище</p>
      </div>
    );
  }

  // Direct handler for image selection
  const handleImageSelect = (imageUrl: string) => {
    console.log("StoredImageGallery: handleImageSelect called with URL:", imageUrl);
    
    // Update local state to show selection
    setSelectedImageUrl(imageUrl);
    
    // Call the parent handler directly
    console.log("StoredImageGallery: calling onImageSelect with URL:", imageUrl);
    onImageSelect(imageUrl);
    
    // Show a toast to confirm selection
    toast({
      title: "Изображение выбрано",
      description: "Изображение будет установлено как обложка"
    });
    
    console.log("StoredImageGallery: image selection completed");
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
      gap: '16px',
      maxHeight: '400px',
      overflowY: 'auto',
      padding: '8px'
    }}>
      {images.map((image) => (
        <div
          key={image.name}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => handleImageSelect(image.url)}
        >
          <Card
            style={{
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
              border: selectedImageUrl === image.url 
                ? '3px solid var(--g-color-base-brand)' 
                : '1px solid var(--g-color-line-generic)',
              borderRadius: 'var(--g-border-radius-m)',
              boxShadow: selectedImageUrl === image.url 
                ? '0 0 0 1px var(--g-color-base-brand)' 
                : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedImageUrl !== image.url) {
                e.currentTarget.style.border = '2px solid var(--g-color-base-brand-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedImageUrl !== image.url) {
                e.currentTarget.style.border = '1px solid var(--g-color-line-generic)';
              }
            }}
          >
            <div style={{ aspectRatio: '1', width: '100%', position: 'relative' }}>
              <Image
                src={image.url}
                alt={image.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
              />
            </div>
          </Card>
          {selectedImageUrl === image.url && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'var(--g-color-base-brand)',
              color: 'white',
              borderRadius: '50%',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StoredImageGallery;
