
import React from "react";
import { Text, TextInput, TextArea } from '@gravity-ui/uikit';
import FeaturedImageSection from "./FeaturedImageSection";

interface PostMetadataProps {
  title: string;
  setTitle: (title: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  excerpt: string;
  setExcerpt: (excerpt: string) => void;
  featuredImageUrl: string | null;
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
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="min-w-[180px]"><Text color="secondary" variant="subheader-1">Заголовок</Text></div>
        <TextInput
          size="l"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок поста"
          className="text-3xl font-bold"
        />
      </div>

      <div className="flex gap-2">
        <div className="min-w-[180px]"><Text color="secondary" variant="subheader-1">URL</Text></div>
        <TextInput
          size="l"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug-url"
          className="text-sm font-mono"
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
      <div className="flex gap-2">
        <div className="min-w-[180px]"><Text color="secondary" variant="subheader-1">Описание</Text></div>
        <TextArea
          size="l"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Краткое описание поста"
          className="resize-none"
          rows={2}
        />
      </div>
    </div>
  );
};

export default PostMetadata;
