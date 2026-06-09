import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { transliterate } from '@/lib/transliterate';

function normalizeSlug(value: string): string {
  const hasCyrillic = /[а-яА-ЯёЁ]/.test(value);
  const processed = hasCyrillic ? transliterate(value) : value;
  return processed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function loadInitialContent(raw: any): string {
  if (!raw) return '';
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

export const useBlogEditorContent = (initialPost?: any, onSave?: (published: boolean, post: any) => void) => {
  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [slug, setSlug] = useState(initialPost?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialPost?.slug);
  const [markdownContent, setMarkdownContent] = useState(() => loadInitialContent(initialPost?.content));
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(initialPost?.featured_image ?? null);
  const [showFeaturedImage, setShowFeaturedImage] = useState<boolean>(initialPost?.show_featured_image ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState('');
  const [activeImageTab, setActiveImageTab] = useState('prompt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleContentChange = (value: string) => setMarkdownContent(value);

  const handleSlugChange = (newSlug: string) => {
    setSlug(normalizeSlug(newSlug));
    setSlugManuallyEdited(true);
  };

  useEffect(() => {
    if (title && !slugManuallyEdited) {
      setSlug(normalizeSlug(title));
    }
  }, [title, slugManuallyEdited]);

  const savePost = async (publish: boolean) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Authentication Required', description: 'Please sign in to save blog posts', variant: 'destructive' });
        router.push('/auth/login');
        return;
      }

      if (!title.trim()) {
        toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
        return;
      }
      if (!markdownContent.trim()) {
        toast({ title: 'Error', description: 'Content is required', variant: 'destructive' });
        return;
      }

      const finalSlug = normalizeSlug(slug.trim() ? slug : title);
      if (!finalSlug) {
        toast({ title: 'Error', description: 'Slug is required', variant: 'destructive' });
        return;
      }

      const postData = {
        title,
        slug: finalSlug,
        excerpt,
        content: markdownContent,
        featured_image: featuredImageUrl,
        show_featured_image: showFeaturedImage,
        published: publish,
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(
        initialPost?.id ? `/api/blog-posts/${initialPost.id}` : '/api/blog-posts',
        {
          method: initialPost?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
          body: JSON.stringify(postData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? errorData.details ?? 'Failed to save post');
      }

      const result = await response.json();
      toast({ title: 'Success', description: publish ? 'Post published successfully' : 'Post saved as draft' });
      onSave?.(publish, result);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save post',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('You must be logged in to upload images');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'featured');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'x-user-id': session.user.id },
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Failed to upload image');
      }
      const { data } = await response.json();
      setFeaturedImageUrl(data.url ?? data.directUrl ?? data.publicUrl ?? null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload featured image', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFeaturedImage = async () => {
    setFeaturedImageUrl(null);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a prompt for image generation', variant: 'destructive' });
      return;
    }
    try {
      setIsGenerating(true);
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      if (!response.ok) throw new Error('Failed to generate image');
      const data = await response.json();
      setGeneratedImagePreview(data.imageData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate image', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyGeneratedImage = () => {
    setFeaturedImageUrl(generatedImagePreview);
    setShowGenerationDialog(false);
  };

  const handleSelectGalleryImage = (imageUrl: string) => {
    if (!imageUrl || typeof imageUrl !== 'string') {
      toast({ title: 'Ошибка', description: 'Неверный URL изображения', variant: 'destructive' });
      return;
    }
    setFeaturedImageUrl(imageUrl);
    toast({ title: 'Изображение установлено', description: 'Изображение из галереи установлено как обложка' });
    setShowGenerationDialog(false);
  };

  return {
    title, setTitle,
    slug, setSlug: handleSlugChange,
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
    savePost,
  };
};
