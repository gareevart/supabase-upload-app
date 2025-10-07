import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { convertBlocksToTipTap, convertTipTapToBlocks, normalizeTipTapContent } from "@/lib/tiptapConverter";
import { EditorContent } from "@/app/components/blog/editor/types";
import { transliterate } from "@/lib/transliterate";

export const useTipTapEditor = (initialPost?: any, onSave?: (published: boolean, post: any) => void) => {
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialPost?.slug);
  
  // Initialize content based on the format of initialPost.content
  const [tipTapContent, setTipTapContent] = useState(() => {
    return normalizeTipTapContent(initialPost?.content);
  });
  
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialPost?.featured_image || null);
  const [showFeaturedImage, setShowFeaturedImage] = useState(initialPost?.show_featured_image ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState("");
  const [activeImageTab, setActiveImageTab] = useState("prompt");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  // Handle TipTap content changes
  const handleContentChange = (newContent: string) => {
    setTipTapContent(newContent);
  };

  const savePost = async (publish: boolean) => {
    setIsLoading(true);
    
    try {
      // Check authentication first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        toast({
          title: "Authentication Required",
          description: "Please sign in to save blog posts",
          variant: "destructive"
        });
        router.push("/auth/login");
        return;
      }

      // Validate required fields
      if (!title.trim()) {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive"
        });
        return;
      }

      if (!tipTapContent.trim()) {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Content is required",
          variant: "destructive"
        });
        return;
      }

      // Generate slug if not provided
      let finalSlug = slug;
      if (!finalSlug.trim()) {
        // Check if title contains Cyrillic characters
        const hasCyrillic = /[а-яА-ЯёЁ]/.test(title);
        
        // If title has Cyrillic characters, transliterate them
        const processedTitle = hasCyrillic ? transliterate(title) : title;
        
        finalSlug = processedTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
      }

      // Prepare post data
      const postData = {
        title,
        slug: finalSlug,
        excerpt,
        content: tipTapContent,
        featured_image: featuredImageUrl,
        show_featured_image: showFeaturedImage,
        published: publish,
        updated_at: new Date().toISOString()
      };

      let result;
      
      // Use Supabase client directly instead of API routes
      if (initialPost?.id) {
        // Update existing post
        const { data, error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', initialPost.id)
          .select()
          .single();
          
        if (error) {
          console.error("Supabase update error:", error);
          throw new Error(error.message || "Failed to update post");
        }
        result = data;
      } else {
        // Create new post
        const { data, error } = await supabase
          .from('blog_posts')
          .insert({
            ...postData,
            author_id: session.user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error("Supabase insert error:", error);
          throw new Error(error.message || "Failed to create post");
        }
        result = data;
      }

      toast({
        title: "Success",
        description: publish ? "Post published successfully" : "Post saved as draft"
      });

      if (onSave) onSave(publish, result);
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save post",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('You must be logged in to upload images');
      }
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'featured');
      
      // Send the file to your upload API with authentication
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'x-user-id': session.user.id
        },
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const responseData = await response.json();
      
      if (!responseData.data) {
        throw new Error('Invalid response format from upload API');
      }
      
      // Try all available URLs
      const imageUrl = responseData.data.url ||
                       responseData.data.directUrl ||
                       responseData.data.publicUrl;
      
      setFeaturedImageUrl(imageUrl);
      
    } catch (error) {
      console.error('Error uploading featured image:', error);
      toast({
        title: "Error",
        description: "Failed to upload featured image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFeaturedImage = async (): Promise<void> => {
    setFeaturedImageUrl(null);
    return Promise.resolve();
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for image generation",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate image');
      }
      
      const data = await response.json();
      // Use imageData (base64) for preview if available, otherwise use imageUrl
      setGeneratedImagePreview(data.imageData || data.imageUrl);
      
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyGeneratedImage = () => {
    setFeaturedImageUrl(generatedImagePreview);
    setShowGenerationDialog(false);
  };

  // Implementation to set the featured image URL from gallery
  const handleSelectGalleryImage = (imageUrl: string) => {
    console.log("handleSelectGalleryImage called with URL:", imageUrl);
    
    // Make sure we're getting a valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error("Invalid image URL:", imageUrl);
      toast({
        title: "Ошибка",
        description: "Неверный URL изображения",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Set the featured image URL directly
      console.log("Setting featured image URL to:", imageUrl);
      setFeaturedImageUrl(imageUrl);
      
      // Notify with a toast message for confirmation
      toast({
        title: "Изображение установлено",
        description: "Изображение из галереи установлено как обложка"
      });
      
      // Close the dialog
      setShowGenerationDialog(false);
      
      console.log("Featured image URL updated successfully");
    } catch (error) {
      console.error("Error in handleSelectGalleryImage:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось установить изображение как обложку",
        variant: "destructive"
      });
    }
  };

  // Custom setSlug function that tracks manual edits
  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setSlugManuallyEdited(true);
  };

  // Generate slug from title
  useEffect(() => {
    // Only auto-generate slug if it hasn't been manually edited
    if (title && !slugManuallyEdited) {
      // Check if title contains Cyrillic characters
      const hasCyrillic = /[а-яА-ЯёЁ]/.test(title);
      
      // If title has Cyrillic characters, transliterate them
      const processedTitle = hasCyrillic ? transliterate(title) : title;
      
      const generatedSlug = processedTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, slugManuallyEdited]);

  return {
    title, setTitle,
    slug, setSlug: handleSlugChange,
    excerpt, setExcerpt,
    tipTapContent,
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
  };
};
