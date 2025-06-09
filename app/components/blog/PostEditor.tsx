import React from "react";
import { Button, Icon } from '@gravity-ui/uikit';
import { Card, CardContent } from "@/app/components/ui/card";
import { usePostEditor } from "@/hooks/usePostEditor";
import PostMetadata from "./editor/PostMetadata";
import ContentBlock from "./editor/ContentBlock";
import { EditorContent } from "./editor/types";

type PostEditorProps = {
  initialPost?: any;
  onSave?: () => void;
};

const PostEditor = ({ initialPost, onSave }: PostEditorProps) => {
  const {
    title, setTitle,
    slug, setSlug,
    excerpt, setExcerpt,
    content,
    featuredImageUrl,
    isLoading,
    currentEditingIndex,
    imagePrompt, setImagePrompt,
    showGenerationDialog, setShowGenerationDialog,
    generatedImagePreview,
    activeImageTab, setActiveImageTab,
    isGenerating, isUploading,
    handleContentChange,
    addContentBlock,
    moveContentBlock,
    handleGenerateImage,
    handleApplyGeneratedImage,
    handleSelectGalleryImage,
    deleteContentBlock,
    handleImageUpload,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleAltTextChange,
    handleTextGenerated,
    handleBlockTypeChange,
    savePost
  } = usePostEditor(initialPost, onSave);

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

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Содержание поста</h3>
            {content.map((block, index) => (
              <ContentBlock
                key={index}
                block={block}
                index={index}
                isCurrentEditing={index === currentEditingIndex}
                content={content}
                onMoveBlock={moveContentBlock}
                onDeleteBlock={deleteContentBlock}
                onContentChange={handleContentChange}
                onAddContentBlock={addContentBlock}
                onBlockTypeChange={handleBlockTypeChange}
                onImageUpload={handleImageUpload}
                onAltTextChange={handleAltTextChange}
                onTextGenerated={handleTextGenerated}
              />
            ))}
          </div>
        </CardContent>
      </Card>

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
