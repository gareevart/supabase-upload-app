"use client";

import React from "react";
import { Text, TextInput, TextArea, Checkbox } from '@gravity-ui/uikit';
import { FormRow } from '@gravity-ui/components';
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
  onSelectGalleryImage: (imageUrl: string) => void;
  isUploading: boolean;
  showGalleryDialog: boolean;
  setShowGalleryDialog: (show: boolean) => void;
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
  onSelectGalleryImage,
  isUploading,
  showGalleryDialog,
  setShowGalleryDialog
}) => {
  const { t } = useI18n();

  return (
    <div className="post-metadata">
      <FormRow
        label={t('blogEditor.titleLabel')}
        fieldId="post-title"
        required
        direction="column"
      >
        <TextInput
          id="post-title"
          size="l"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('blogEditor.titlePlaceholder')}
        />
      </FormRow>

      <FormRow
        label={t('blogEditor.urlLabel')}
        fieldId="post-slug"
        direction="column"
      >
        <TextInput
          id="post-slug"
          size="l"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t('blogEditor.urlPlaceholder')}
        />
      </FormRow>

      <FeaturedImageSection
        featuredImageUrl={featuredImageUrl}
        onDeleteImage={onDeleteFeaturedImage}
        onUploadImage={onUploadFeaturedImage}
        onSelectGalleryImage={onSelectGalleryImage}
        isUploading={isUploading}
        showGalleryDialog={showGalleryDialog}
        setShowGalleryDialog={setShowGalleryDialog}
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

      <FormRow
        label={t('blogEditor.descriptionLabel')}
        fieldId="post-excerpt"
        direction="column"
      >
        <TextArea
          id="post-excerpt"
          size="l"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={t('blogEditor.descriptionPlaceholder')}
          rows={2}
        />
      </FormRow>
    </div>
  );
};

export default PostMetadata;
