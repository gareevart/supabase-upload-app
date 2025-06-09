import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ImageHandlers } from "./types";
import { useImageGeneration } from "../../hooks/useImageGeneration";

export function useImageHandlers(): ImageHandlers & { 
  featuredImageUrl: string | null,
  setFeaturedImageUrl: React.Dispatch<React.SetStateAction<string | null>>,
  featuredImage: File | null,
  setFeaturedImage: React.Dispatch<React.SetStateAction<File | null>>,
  imagePrompt: string,
  setImagePrompt: React.Dispatch<React.SetStateAction<string>>,
  showGenerationDialog: boolean,
  setShowGenerationDialog: React.Dispatch<React.SetStateAction<boolean>>,
  generatedImagePreview: string | null,
  setGeneratedImagePreview: React.Dispatch<React.SetStateAction<string | null>>,
  activeImageTab: string,
  setActiveImageTab: React.Dispatch<React.SetStateAction<string>>,
  isGenerating: boolean,
  isUploading: boolean,
  deleteImage: (imageUrl: string) => Promise<boolean>
} {
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<string>("prompt");

  const { toast } = useToast();
  const { generateImage, deleteImage, isGenerating, isUploading } = useImageGeneration();

  const handleImageUpload = async (index: number, file: File): Promise<void> => {
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete previous image if this is replacing an existing image block
      // Note: The content parameter is not available here, so we assume the caller
      // has checked if there is an existing image to delete

      // Используем бакет posts для загрузки изображений в контенте
      const { error: uploadError, data } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);

      // Instead of returning the URL, we need to handle it elsewhere
      // This function's return type is Promise<void>
      // The calling code should handle the URL appropriately
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Ошибка загрузки изображения",
        description: error instanceof Error ? error.message : "Произошла ошибка при загрузке",
        variant: "destructive",
      });
    }
  };

  const handleFeaturedImageUpload = async (file: File) => {
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `featured_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete previous featured image if it exists
      if (featuredImageUrl) {
        await deleteImage(featuredImageUrl);
      }

      // Используем бакет posts для загрузки главного изображения
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);
      
      setFeaturedImageUrl(publicUrl);
      setFeaturedImage(file);

    } catch (error) {
      console.error("Error uploading featured image:", error);
      toast({
        title: "Ошибка загрузки главного изображения",
        description: error instanceof Error ? error.message : "Произошла ошибка при загрузке",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeaturedImage = async () => {
    if (featuredImageUrl) {
      await deleteImage(featuredImageUrl);
      setFeaturedImageUrl(null);
      setFeaturedImage(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt && activeImageTab === "prompt") {
      toast({
        title: "Введите описание изображения",
        description: "Для генерации изображения необходимо ввести текстовое описание",
        variant: "destructive",
      });
      return;
    }

    try {
      setGeneratedImagePreview(null); // Reset preview
      const generatedImageUrl = await generateImage(imagePrompt);
      
      if (generatedImageUrl) {
        setGeneratedImagePreview(generatedImageUrl);
      }
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла ошибка при генерации изображения',
        variant: 'destructive',
      });
    }
  };

  const handleApplyGeneratedImage = () => {
    if (generatedImagePreview) {
      // Delete previous featured image if it exists
      if (featuredImageUrl) {
        deleteImage(featuredImageUrl);
      }
      
      setFeaturedImageUrl(generatedImagePreview);
      toast({
        title: "Изображение установлено",
        description: "Обложка для поста успешно установлена",
      });
      setShowGenerationDialog(false);
      setGeneratedImagePreview(null);
      setImagePrompt("");
    }
  };

  const handleSelectGalleryImage = (imageUrl: string) => {
    // Delete previous featured image if it exists
    if (featuredImageUrl) {
      deleteImage(featuredImageUrl);
    }
    
    setFeaturedImageUrl(imageUrl);
    toast({
      title: "Изображение выбрано",
      description: "Обложка для поста успешно установлена",
    });
    setShowGenerationDialog(false);
  };

  return {
    featuredImageUrl,
    setFeaturedImageUrl,
    featuredImage,
    setFeaturedImage,
    imagePrompt,
    setImagePrompt,
    showGenerationDialog,
    setShowGenerationDialog,
    generatedImagePreview,
    setGeneratedImagePreview,
    activeImageTab, 
    setActiveImageTab,
    isGenerating,
    isUploading,
    handleImageUpload,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleGenerateImage,
    handleApplyGeneratedImage,
    handleSelectGalleryImage,
    deleteImage
  };
}
