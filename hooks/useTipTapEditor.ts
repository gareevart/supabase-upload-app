import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { convertBlocksToTipTap, convertTipTapToBlocks, normalizeTipTapContent } from "@/lib/tiptapConverter";
import { EditorContent } from "@/app/components/blog/editor/types";

export const useTipTapEditor = (initialPost?: any, onSave?: () => void) => {
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  
  // Initialize content based on the format of initialPost.content
  const [tipTapContent, setTipTapContent] = useState(() => {
    return normalizeTipTapContent(initialPost?.content);
  });
  
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialPost?.featured_image || null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState("");
  const [activeImageTab, setActiveImageTab] = useState("upload");
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
        finalSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
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

      if (onSave) onSave();
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
      console.log('Image upload response:', responseData);
      
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
      setGeneratedImagePreview(data.imageUrl);
      
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

  const handleSelectGalleryImage = (imageUrl: string) => {
    setFeaturedImageUrl(imageUrl);
  };

  // Generate slug from title
  useEffect(() => {
    if (title && !slug && !initialPost?.slug) {
      // Only auto-generate slug if it's a new post and slug is empty
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      setSlug(generatedSlug);
    }
  }, [title, slug, initialPost?.slug]);

  return {
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
  };
};