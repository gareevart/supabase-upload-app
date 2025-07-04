
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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
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

  // Direct handler for image selection
  const handleImageSelect = (imageUrl: string) => {
    console.log("StoredImageGallery: handleImageSelect called with URL:", imageUrl);
    
    // Update local state to show selection
    setSelectedImageUrl(imageUrl);
    
    // Call the parent handler directly
    console.log("StoredImageGallery: calling onImageSelect with URL:", imageUrl);
    onImageSelect(imageUrl);
    
    // Show a toast to confirm selection
    toast({
      title: "Изображение выбрано",
      description: "Изображение будет установлено как обложка"
    });
    
    console.log("StoredImageGallery: image selection completed");
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
      {images.map((image) => (
        <div
          key={image.name}
          className="relative cursor-pointer"
          onClick={() => handleImageSelect(image.url)}
        >
          <Card
            className={`overflow-hidden transition-all ${
              selectedImageUrl === image.url
                ? 'ring-4 ring-blue-500'
                : 'hover:ring-2 hover:ring-primary'
            }`}
          >
            <div className="aspect-square w-full relative">
              <img
                src={image.url}
                alt={image.name}
                className="object-cover absolute inset-0 w-full h-full"
              />
            </div>
          </Card>
          {selectedImageUrl === image.url && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StoredImageGallery;
