import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const generateImage = async (prompt: string): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        toast({
          title: 'Изображение сгенерировано',
          description: 'Изображение успешно создано',
        });
        return data.imageUrl;
      } else {
        throw new Error('Не получен URL изображения');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: 'Ошибка генерации',
        description: error instanceof Error ? error.message : 'Не удалось сгенерировать изображение',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    setIsUploading(true);
    try {
      // Extract the file path from the URL
      // URL format: https://storage.yandexcloud.net/public-gareevde/featured/userId/filename.jpg
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      // Remove empty first element and bucket name
      pathParts.shift(); // remove ''
      pathParts.shift(); // remove 'public-gareevde'
      const filePath = pathParts.join('/'); // e.g., 'featured/userId/filename.jpg'
      
      // Use the delete API endpoint with query parameter
      const response = await fetch(`/api/storage/delete?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete image');
      }

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      toast({
        title: 'Delete Error',
        description: 'Failed to delete image',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    generateImage,
    deleteImage,
    isGenerating,
    isUploading
  };
}