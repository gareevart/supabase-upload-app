"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Text } from '@gravity-ui/uikit';
import PostMetadata from '@/app/components/blog/editor/PostMetadata';
import TipTapEditor from '@/app/components/blog/TipTapEditor';
import { useTipTapEditor } from '@/hooks/useTipTapEditor';

interface StaticPageEditorProps {
  initialPage?: any;
}

export default function StaticPageEditor({ initialPage }: StaticPageEditorProps) {
  const router = useRouter();
  const [isHomepage, setIsHomepage] = useState<boolean>(initialPage?.is_homepage ?? false);

  const {
    title,
    setTitle,
    slug,
    setSlug,
    excerpt,
    setExcerpt,
    tipTapContent,
    featuredImageUrl,
    showFeaturedImage,
    setShowFeaturedImage,
    isLoading,
    imagePrompt,
    setImagePrompt,
    showGenerationDialog,
    setShowGenerationDialog,
    generatedImagePreview,
    activeImageTab,
    setActiveImageTab,
    isGenerating,
    isUploading,
    handleContentChange,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleGenerateImage,
    handleApplyGeneratedImage,
    handleSelectGalleryImage
  } = useTipTapEditor(initialPage);

  const savePage = async (publish: boolean) => {
    const payload = {
      title,
      slug,
      excerpt,
      content: tipTapContent,
      featured_image: featuredImageUrl,
      published: publish,
      is_homepage: isHomepage
    };

    const response = await fetch(initialPage?.id ? `/api/static-pages/${initialPage.id}` : '/api/static-pages', {
      method: initialPage?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Не удалось сохранить страницу');
    }

    router.push('/admin/static-pages');
    router.refresh();
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <Text variant="display-1">Static page editor</Text>

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

      <div className="p-4 border rounded-md">
        <Checkbox checked={isHomepage} onUpdate={setIsHomepage} content="Use this page as main homepage" />
      </div>

      <TipTapEditor content={tipTapContent} onChange={handleContentChange} placeholder="Type static page content..." />

      <div className="flex gap-4">
        <Button size="l" view="action" loading={isLoading} onClick={() => void savePage(true)}>
          Publish page
        </Button>
        <Button size="l" view="outlined" loading={isLoading} onClick={() => void savePage(false)}>
          Save as draft
        </Button>
      </div>
    </div>
  );
}
