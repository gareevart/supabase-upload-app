"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EDITOR_MENU_EVENT } from "@/app/components/Navigation/Navigation";
import { useBlogEditorContent } from "@/features/blog-editor/model/useBlogEditorContent";
import { useI18n } from "@/app/contexts/I18nContext";
import PostMetadata from "./editor/PostMetadata";
import { MarkdownEditor } from "@/features/blog-editor/ui/MarkdownEditor";
import "./BlogEditor.css";

type PostEditorProps = {
  initialPost?: any;
  onSave?: (published: boolean, post: any) => void;
};

const PostEditor = ({ initialPost, onSave }: PostEditorProps) => {
  const { t } = useI18n();
  const router = useRouter();
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

  useEffect(() => {
    const onCancel = () => {
      window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, { detail: null }));

      // When the editor is opened directly, there may be no usable history entry.
      // Keep browser back behavior when history exists and fall back to the blog list otherwise.
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/blog');
      }
    };

    window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, {
      detail: {
        mode: 'blog',
        actionLabel: initialPost ? 'Save' : 'Create',
        onAction: () => savePost(false),
        onCancel,
      },
    }));

    return () => window.dispatchEvent(new CustomEvent(EDITOR_MENU_EVENT, { detail: null }));
  }, [initialPost, router, savePost]);

  return (
    <div className="post-editor">
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
        placeholder={t('blogEditor.contentPlaceholder')}
      />

    </div>
  );
};

export default PostEditor;
