import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const generateImage = async (prompt: string): Promise<string | null> => {
    setIsGenerating(true);
    try {
      if (!prompt || !prompt.trim()) {
        toast({
          title: 'Введите описание',
          description: 'Промпт для генерации изображения не может быть пустым',
          variant: 'destructive',
        });
        return null;
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = (errorData as any).error || `Не удалось сгенерировать изображение (${response.status})`;
        throw new Error(message);
      }

      const data: { imageUrl?: string; imageData?: string } = await response.json();

      const previewUrl = data.imageData || data.imageUrl || null;
      if (!previewUrl) {
        throw new Error('Сервис не вернул ссылку на изображение');
      }

      return previewUrl;
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate image',
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