"use client";

import React from "react";
import { Text, TextInput, TextArea, Checkbox } from '@gravity-ui/uikit';
import { useI18n } from "@/app/contexts/I18nContext";
import FeaturedImageSection from "./FeaturedImageSection";

interface PostMetadataProps {
  title: string;
  setTitle: (title: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  excerpt: string;
  setExcerpt: (excerpt: string) => void;
  featuredImageUrl: string | null;
  showFeaturedImage: boolean;
  setShowFeaturedImage: (show: boolean) => void;
  onDeleteFeaturedImage: () => Promise<void>;
  onUploadFeaturedImage: (file: File) => void;
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

const PostMetadata: React.FC<PostMetadataProps> = ({
  title,
  setTitle,
  slug,
  setSlug,
  excerpt,
  setExcerpt,
  featuredImageUrl,
  showFeaturedImage,
  setShowFeaturedImage,
  onDeleteFeaturedImage,
  onUploadFeaturedImage,
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

  return (
    <div className="post-metadata">
      <div className="post-metadata__field">
        <Text color="secondary" variant="subheader-1">{t('blogEditor.titleLabel')}</Text>
        <TextInput
          size="l"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('blogEditor.titlePlaceholder')}
        />
      </div>

      <div className="post-metadata__field">
        <Text color="secondary" variant="subheader-1">{t('blogEditor.urlLabel')}</Text>
        <TextInput
          size="l"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t('blogEditor.urlPlaceholder')}
        />
      </div>

      <FeaturedImageSection
        featuredImageUrl={featuredImageUrl}
        onDeleteImage={onDeleteFeaturedImage}
        onUploadImage={onUploadFeaturedImage}
        onGenerateImage={onGenerateImage}
        onApplyGeneratedImage={onApplyGeneratedImage}
        onSelectGalleryImage={onSelectGalleryImage}
        isGenerating={isGenerating}
        isUploading={isUploading}
        imagePrompt={imagePrompt}
        setImagePrompt={setImagePrompt}
        generatedImagePreview={generatedImagePreview}
        activeImageTab={activeImageTab}
        setActiveImageTab={setActiveImageTab}
        showGenerationDialog={showGenerationDialog}
        setShowGenerationDialog={setShowGenerationDialog}
      />

      {featuredImageUrl && (
        <div className="post-metadata__field">
          <Checkbox
            checked={showFeaturedImage}
            onUpdate={setShowFeaturedImage}
            size="l"
          >
            <Text variant="subheader-1">{t('blogEditor.showCover')}</Text>
          </Checkbox>
        </div>
      )}
      <div className="post-metadata__field">
        <Text color="secondary" variant="subheader-1">{t('blogEditor.descriptionLabel')}</Text>
        <TextArea
          size="l"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={t('blogEditor.descriptionPlaceholder')}
          rows={2}
        />
      </div>
    </div>
  );
};

export default PostMetadata;
