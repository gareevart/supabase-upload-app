"use client";

import { useRouter } from "next/navigation";
import { Button } from '@gravity-ui/uikit';
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

  const handleSave = () => {
    void savePost(initialPost ? Boolean(initialPost.published) : false);
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/blog');
    }
  };

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

      <div className="post-editor__actions">
        <Button
          type="button"
          size="l"
          view="action"
          loading={isLoading}
          onClick={handleSave}
        >
          {t(initialPost ? 'blogEditor.save' : 'blogEditor.create')}
        </Button>
        <Button
          type="button"
          size="l"
          view="flat"
          disabled={isLoading}
          onClick={handleCancel}
        >
          {t('blogEditor.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default PostEditor;
