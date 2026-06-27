"use client";

import React, { useState, useEffect } from "react";
import { Button, Text, TextArea, Dialog, SegmentedRadioGroup, Flex } from '@gravity-ui/uikit';
import StoredImageGallery from "../StoredImageGallery";
import { useI18n } from "@/app/contexts/I18nContext";
import NextImage from "next/image";

interface FeaturedImageSectionProps {
  featuredImageUrl: string | null;
  onDeleteImage: () => Promise<void>;
  onUploadImage: (file: File) => void;
  onGenerateImage: () => Promise<void>;
  onApplyGeneratedImage: () => void;
  onSelectGalleryImage: (imageUrl: string) => void;
  isGenerating: boolean;
  isUploading: boolean;
  imagePrompt: string;
  setImagePrompt: (value: string) => void;
  generatedImagePreview: string | null;
  activeImageTab: string;
  setActiveImageTab: (tab: string) => void;
  showGenerationDialog: boolean;
  setShowGenerationDialog: (show: boolean) => void;
}

const FeaturedImageSection: React.FC<FeaturedImageSectionProps> = ({
  featuredImageUrl: propFeaturedImageUrl,
  onDeleteImage,
  onUploadImage,
  onGenerateImage,
  onApplyGeneratedImage,
  onSelectGalleryImage,
  isGenerating,
  isUploading,
  imagePrompt,
  setImagePrompt,
  generatedImagePreview,
  activeImageTab,
  setActiveImageTab,
  showGenerationDialog,
  setShowGenerationDialog
}) => {
  const { t } = useI18n();
  // Maintain local state for the featured image URL
  const [localFeaturedImageUrl, setLocalFeaturedImageUrl] = useState<string | null>(propFeaturedImageUrl);

  // Direct handler for selecting a gallery image
  const handleSelectGalleryImage = (imageUrl: string) => {
    setLocalFeaturedImageUrl(imageUrl);
    onSelectGalleryImage(imageUrl);
    setShowGenerationDialog(false);
  };

  // Update local state when prop changes
  useEffect(() => {
    setLocalFeaturedImageUrl(propFeaturedImageUrl);
  }, [propFeaturedImageUrl]);

  // Local handler for deleting the image
  const handleDeleteImage = async () => {
    setLocalFeaturedImageUrl(null);
    await onDeleteImage();
  };

  return (
    <div className="featured-image">
      <Text color="secondary" variant="subheader-1">{t('blogEditor.coverLabel')}</Text>
      {localFeaturedImageUrl ? (
        <div className="featured-image__preview">
          <NextImage
            src={localFeaturedImageUrl}
            alt={t('blogEditor.coverLabel')}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: 'auto', height: 'auto', maxHeight: '15rem' }}
            className="featured-image__img"
            onError={() => console.error("Image failed to load:", localFeaturedImageUrl)}
          />
          <div className="featured-image__actions">
            <Button
              size="l"
              view="outlined"
              onClick={() => setShowGenerationDialog(true)}
            >
              {t('blogEditor.generate')}
            </Button>
            <Button
              size="l"
              view="outlined-danger"
              onClick={handleDeleteImage}
            >
              {t('blogEditor.delete')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="featured-image__actions">
          <Button
            size="l"
            view="normal"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  onUploadImage(file);
                }
              };
              input.click();
            }}
          >
            {t('blogEditor.upload')}
          </Button>
          <Button
            size="l"
            view="outlined"
            onClick={() => setShowGenerationDialog(true)}
          >
            {t('blogEditor.generate')}
          </Button>
        </div>
      )}

      <ImageGenerationDialog
        showDialog={showGenerationDialog}
        setShowDialog={setShowGenerationDialog}
        activeTab={activeImageTab}
        setActiveTab={setActiveImageTab}
        imagePrompt={imagePrompt}
        setImagePrompt={setImagePrompt}
        generatedImagePreview={generatedImagePreview}
        isGenerating={isGenerating}
        isUploading={isUploading}
        onGenerateImage={onGenerateImage}
        onApplyGeneratedImage={() => {
          // Apply the generated image to our local state
          if (generatedImagePreview) {
            setLocalFeaturedImageUrl(generatedImagePreview);
            onApplyGeneratedImage();
          }
        }}
        onSelectGalleryImage={handleSelectGalleryImage}
      />
    </div>
  );
};

interface ImageGenerationDialogProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  generatedImagePreview: string | null;
  isGenerating: boolean;
  isUploading: boolean;
  onGenerateImage: () => Promise<void>;
  onApplyGeneratedImage: () => void;
  onSelectGalleryImage: (imageUrl: string) => void;
}

const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  showDialog,
  setShowDialog,
  activeTab,
  setActiveTab,
  imagePrompt,
  setImagePrompt,
  generatedImagePreview,
  isGenerating,
  isUploading,
  onGenerateImage,
  onApplyGeneratedImage,
  onSelectGalleryImage
}) => {
  const { t } = useI18n();

  const handleTabChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setActiveTab(event.target.value);
  };

  return (
    <Dialog
      size="s"
      open={showDialog}
      onClose={() => setShowDialog(false)}
      aria-labelledby="featured-image-dialog-title"
    >
      <Dialog.Header caption={t('blogEditor.imageDialogTitle')} id="featured-image-dialog-title" />
      <Dialog.Body>
        <div className="image-dialog__tabs">
          <SegmentedRadioGroup
            size="l"
            value={activeTab}
            onChange={handleTabChange}
            options={[
              { value: 'prompt', content: t('blogEditor.tabGenerate') },
              { value: 'gallery', content: t('blogEditor.tabGallery') },
            ]}
            width="max"
          />
        </div>

        {activeTab === 'prompt' && (
          <div className="image-dialog__section">
            <div>
              <Text variant="body-1" className="image-dialog__label">
                {t('blogEditor.describeImage')}
              </Text>
              <TextArea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder={t('blogEditor.imagePromptPlaceholder')}
                rows={5}
              />
            </div>

            {generatedImagePreview && (
              <div className="image-dialog__preview">
                <Text variant="body-1" className="image-dialog__label">{t('blogEditor.preview')}</Text>
                <NextImage
                  src={generatedImagePreview}
                  alt={t('blogEditor.preview')}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: '100%', height: 'auto' }}
                  className="image-dialog__preview-img"
                />
                <Button
                  view="normal-contrast"
                  size="m"
                  className="image-dialog__regenerate"
                  onClick={onGenerateImage}
                  loading={isGenerating}
                >
                  {t('blogEditor.generateAgain')}
                </Button>
              </div>
            )}

            <Flex direction="row" justifyContent="flex-end" gap={2} className="image-dialog__footer">
              <Button view="outlined" size="l" onClick={() => setShowDialog(false)}>
                {t('blogEditor.cancel')}
              </Button>
              {generatedImagePreview ? (
                <Button view="action" size="l" onClick={onApplyGeneratedImage}>
                  {t('blogEditor.apply')}
                </Button>
              ) : (
                <Button
                  view="action"
                  size="l"
                  onClick={onGenerateImage}
                  disabled={isGenerating || isUploading || !imagePrompt.trim()}
                  loading={isGenerating || isUploading}
                >
                  {t('blogEditor.generate')}
                </Button>
              )}
            </Flex>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="image-dialog__section">
            <Text variant="body-1" className="image-dialog__label">{t('blogEditor.selectFromGallery')}</Text>
            <div className="image-dialog__gallery">
              <StoredImageGallery onImageSelect={onSelectGalleryImage} />
            </div>
            <Flex direction="row" justifyContent="flex-end" className="image-dialog__footer">
              <Button view="action" size="l" onClick={() => setShowDialog(false)}>
                {t('blogEditor.close')}
              </Button>
            </Flex>
          </div>
        )}
      </Dialog.Body>
    </Dialog>
  );
};

export default FeaturedImageSection;
