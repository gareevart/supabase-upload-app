import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { EditorContent } from "@/app/components/blog/editor/types";

export const usePostEditor = (initialPost?: any, onSave?: (published: boolean, post: any) => void) => {
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [content, setContent] = useState<EditorContent[]>(initialPost?.content || []);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialPost?.featured_image || null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(-1);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState("");
  const [activeImageTab, setActiveImageTab] = useState("upload");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const savePost = async (publish: boolean) => {
    // Check authentication first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save blog posts",
        variant: "destructive"
      });
      router.push("/auth/login");
      return;
    }

    setIsLoading(true);
    
    try {
      const postData = {
        title,
        slug,
        excerpt,
        content,
        featured_image: featuredImageUrl,
        published: publish
      };

      const method = initialPost?.id ? "PUT" : "POST";
      const url = initialPost?.id 
        ? `/api/blog-posts/${initialPost.id}`
        : "/api/blog-posts";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save post");
      }

      const savedPost = await response.json();
      toast({
        title: "Success",
        description: publish ? "Post published successfully" : "Post saved as draft"
      });

      if (onSave) onSave(publish, savedPost);
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

  // Other existing hook functions would go here
  const handleContentChange = (index: number, newContent: string) => {
    const newBlocks = [...content];
    newBlocks[index] = { ...newBlocks[index], content: newContent };
    setContent(newBlocks);
  };

  const addContentBlock = (type: EditorContent['type'] = "paragraph", index: number) => {
    const newBlocks = [...content];
    newBlocks.splice(index + 1, 0, { type, content: "" });
    setContent(newBlocks);
    setCurrentEditingIndex(index + 1);
  };

  const moveContentBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...content];
    const fromIndex = index;
    const toIndex = direction === "up" ? index - 1 : index + 1;

    if (toIndex < 0 || toIndex >= newBlocks.length) return;

    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    setContent(newBlocks);
    setCurrentEditingIndex(toIndex);
  };

  const deleteContentBlock = (index: number) => {
    const newBlocks = [...content];
    newBlocks.splice(index, 1);
    setContent(newBlocks);
    setCurrentEditingIndex(Math.max(0, index - 1));
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setIsUploading(true);
      // Implement image upload logic
      // Would include similar auth check as in savePost
    } finally {
      setIsUploading(false);
    }
  };

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      // Implement featured image upload logic
      // Would include similar auth check as in savePost
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFeaturedImage = async () => {
    setFeaturedImageUrl(null);
  };

  const handleGenerateImage = async () => {
    try {
      setIsGenerating(true);
      // Implement image generation logic
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

  const handleAltTextChange = (index: number, alt: string) => {
    const newBlocks = [...content];
    newBlocks[index] = { ...newBlocks[index], alt };
    setContent(newBlocks);
  };

  const handleTextGenerated = (text: string, index: number) => {
    const newBlocks = [...content];
    newBlocks[index] = { ...newBlocks[index], content: text };
    setContent(newBlocks);
  };

  const handleBlockTypeChange = (index: number, type: EditorContent['type']) => {
    const newBlocks = [...content];
    newBlocks[index] = { ...newBlocks[index], type };
    setContent(newBlocks);
  };

  return {
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
    deleteContentBlock,
    handleImageUpload,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleGenerateImage,
    handleApplyGeneratedImage,
    handleSelectGalleryImage,
    handleAltTextChange,
    handleTextGenerated,
    handleBlockTypeChange,
    savePost
  };
};