"use client";

import React, { useEffect, useState } from "react";
import { Button, Dialog, Flex, Spin, Text } from '@gravity-ui/uikit';
import StoredImageGallery from "../StoredImageGallery";
import { useI18n } from "@/app/contexts/I18nContext";
import NextImage from "next/image";
import { getBlobPreviewUrl } from "@/lib/blobUrl";

interface FeaturedImageSectionProps {
  featuredImageUrl: string | null;
  onDeleteImage: () => Promise<void>;
  onUploadImage: (file: File) => void;
  onSelectGalleryImage: (imageUrl: string) => void;
  isUploading: boolean;
  showGalleryDialog: boolean;
  setShowGalleryDialog: (show: boolean) => void;
}

const FeaturedImageSection: React.FC<FeaturedImageSectionProps> = ({
  featuredImageUrl: propFeaturedImageUrl,
  onDeleteImage,
  onUploadImage,
  onSelectGalleryImage,
  isUploading,
  showGalleryDialog,
  setShowGalleryDialog,
}) => {
  const { t } = useI18n();
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(propFeaturedImageUrl);

  useEffect(() => {
    setFeaturedImageUrl(propFeaturedImageUrl);
  }, [propFeaturedImageUrl]);

  const handleSelectGalleryImage = (imageUrl: string) => {
    setFeaturedImageUrl(imageUrl);
    onSelectGalleryImage(imageUrl);
    setShowGalleryDialog(false);
  };

  const handleDeleteImage = async () => {
    setFeaturedImageUrl(null);
    await onDeleteImage();
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) onUploadImage(file);
    };
    input.click();
  };

  return (
    <div className="featured-image">
      <Text color="secondary" variant="subheader-1">{t('blogEditor.coverLabel')}</Text>
      {isUploading && (
        <div className="featured-image__uploading" role="status" aria-live="polite">
          <Spin size="s" />
          <Text variant="body-1">Загрузка обложки…</Text>
        </div>
      )}
      {featuredImageUrl ? (
        <div className="featured-image__preview">
          <NextImage
            src={getBlobPreviewUrl(featuredImageUrl) || ''}
            alt={t('blogEditor.coverLabel')}
            width={0}
            height={0}
            unoptimized
            sizes="100vw"
            style={{ width: 'auto', height: 'auto', maxHeight: '15rem' }}
            className="featured-image__img"
            onError={() => console.error("Image failed to load:", featuredImageUrl)}
          />
          <div className="featured-image__actions">
            <Button size="l" view="outlined" onClick={() => setShowGalleryDialog(true)}>
              {t('blogEditor.selectFromGalleryButton')}
            </Button>
            <Button size="l" view="outlined-danger" onClick={handleDeleteImage}>
              {t('blogEditor.delete')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="featured-image__actions">
          <Button size="l" view="normal" disabled={isUploading} onClick={handleUploadClick}>
            {t('blogEditor.upload')}
          </Button>
          <Button size="l" view="outlined" onClick={() => setShowGalleryDialog(true)}>
            {t('blogEditor.selectFromGalleryButton')}
          </Button>
        </div>
      )}

      <Dialog
        size="s"
        open={showGalleryDialog}
        onClose={() => setShowGalleryDialog(false)}
        aria-labelledby="featured-image-dialog-title"
      >
        <Dialog.Header caption={t('blogEditor.imageDialogTitle')} id="featured-image-dialog-title" />
        <Dialog.Body>
          <div className="image-dialog__section">
            <Text variant="body-1" className="image-dialog__label">{t('blogEditor.selectFromGallery')}</Text>
            <div className="image-dialog__gallery">
              <StoredImageGallery onImageSelect={handleSelectGalleryImage} />
            </div>
            <Flex direction="row" justifyContent="flex-end" className="image-dialog__footer">
              <Button view="action" size="l" onClick={() => setShowGalleryDialog(false)}>
                {t('blogEditor.close')}
              </Button>
            </Flex>
          </div>
        </Dialog.Body>
      </Dialog>
    </div>
  );
};

export default FeaturedImageSection;
