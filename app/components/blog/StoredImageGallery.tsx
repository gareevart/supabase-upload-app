
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { Card, Skeleton } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";

interface StoredImageGalleryProps {
  onImageSelect: (imageUrl: string) => void;
}

const StoredImageGallery: React.FC<StoredImageGalleryProps> = ({ onImageSelect }) => {
  const [images, setImages] = useState<Array<{ name: string; url: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        
        // Fetch list of files from the posts bucket
        const { data, error } = await supabase
          .storage
          .from('posts')
          .list();

        if (error) throw error;
        
        // Filter for only image files and get their URLs
        const imageFiles = data.filter(file => 
          file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) && !file.name.startsWith('.'));
        
        const imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const { data } = supabase
              .storage
              .from('posts')
              .getPublicUrl(file.name);
              
            return {
              name: file.name,
              url: data.publicUrl
            };
          })
        );
        
        setImages(imageUrls);
      } catch (error) {
        console.error("Error fetching images:", error);
        toast({
          title: "Ошибка загрузки изображений",
          description: "Не удалось загрузить галерею изображений",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchImages();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center p-4">
        <p>Нет доступных изображений в хранилище</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
      {images.map((image) => (
        <Card 
          key={image.name} 
          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onImageSelect(image.url)}
        >
          <div className="aspect-square w-full relative">
            <img 
              src={image.url} 
              alt={image.name}
              className="object-cover absolute inset-0 w-full h-full"
            />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StoredImageGallery;
