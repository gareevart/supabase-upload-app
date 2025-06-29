"use client";

import React from "react";
import { Button } from '@gravity-ui/uikit';
import { Card, CardContent } from "@/app/components/ui/card";
import { useTipTapEditor } from "@/hooks/useTipTapEditor";
import PostMetadata from "./editor/PostMetadata";
import TipTapEditor from "./TipTapEditor";

type PostEditorProps = {
  initialPost?: any;
  onSave?: () => void;
};

const PostEditor = ({ initialPost, onSave }: PostEditorProps) => {
  const {
    title, setTitle,
    slug, setSlug,
    excerpt, setExcerpt,
    tipTapContent,
    featuredImageUrl,
    isLoading,
    imagePrompt, setImagePrompt,
    showGenerationDialog, setShowGenerationDialog,
    generatedImagePreview,
    activeImageTab, setActiveImageTab,
    isGenerating, isUploading,
    handleContentChange,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleGenerateImage,
    handleApplyGeneratedImage,
    handleSelectGalleryImage,
    savePost
  } = useTipTapEditor(initialPost, onSave);

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <PostMetadata
        title={title}
        setTitle={setTitle}
        slug={slug}
        setSlug={setSlug}
        excerpt={excerpt}
        setExcerpt={setExcerpt}
        featuredImageUrl={featuredImageUrl}
        onDeleteFeaturedImage={handleDeleteFeaturedImage}
        onUploadFeaturedImage={handleFeaturedImageUpload}
        onGenerateImage={handleGenerateImage}
        onApplyGeneratedImage={handleApplyGeneratedImage}
        onSelectGalleryImage={handleSelectGalleryImage}
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

            <h3 className="text-lg font-medium mb-2">Содержание поста</h3>
            <TipTapEditor 
              content={tipTapContent}
              onChange={handleContentChange}
              placeholder="Начните писать содержание поста..."
            />

      <div className="flex justify-start gap-4">
        <Button
          size="l"
          view="action"
          onClick={() => savePost(true)}
          disabled={isLoading}
        >
          Опубликовать
        </Button>
        <Button
          size="l"
          view="outlined"
          onClick={() => savePost(false)}
          disabled={isLoading}
        >
          Сохранить черновик
        </Button>
      </div>
    </div>
  );
};

export default PostEditor;
