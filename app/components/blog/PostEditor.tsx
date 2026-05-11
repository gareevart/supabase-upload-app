"use client";

import React from "react";
import { Button } from '@gravity-ui/uikit';
import { useBlogEditorContent } from "@/features/blog-editor/model/useBlogEditorContent";
import PostMetadata from "./editor/PostMetadata";
import { MarkdownEditor } from "@/features/blog-editor/ui/MarkdownEditor";

type PostEditorProps = {
  initialPost?: any;
  onSave?: (published: boolean, post: any) => void;
};

const PostEditor = ({ initialPost, onSave }: PostEditorProps) => {
  const {
    title, setTitle,
    slug, setSlug,
    excerpt, setExcerpt,
    markdownContent,
    featuredImageUrl,
    showFeaturedImage, setShowFeaturedImage,
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
  } = useBlogEditorContent(initialPost, onSave);

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
        showFeaturedImage={showFeaturedImage}
        setShowFeaturedImage={setShowFeaturedImage}
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
      <MarkdownEditor
        content={markdownContent}
        onChange={handleContentChange}
        placeholder="Type your post content here..."
      />

      <div className="flex justify-start gap-4">
        <Button
          size="l"
          view="action"
          onClick={() => savePost(true)}
          disabled={isLoading}
        >
          Publish
        </Button>
        <Button
          size="l"
          view="outlined"
          onClick={() => savePost(false)}
          disabled={isLoading}
        >
          Save as draft
        </Button>
      </div>
    </div>
  );
};

export default PostEditor;
