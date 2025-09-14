import React, { useState, useEffect } from "react";
import { Button, Text, TextArea, Modal, Icon } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/app/components/ui/tabs";
import StoredImageGallery from "../StoredImageGallery";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter } from "@/app/components/ui/dialog";
import NextImage from "next/image";


interface FeaturedImageSectionProps {
  featuredImageUrl: string | null;
  onDeleteImage: () => Promise<void>;
  onUploadImage: (file: File) => void;
  onGenerateImage: () => Promise<void>;
  onApplyGeneratedImage: () => void;
  onSelectGalleryImage: (imageUrl: string) => void;
  isGenerating: boolean;
  isUploading: boolean;
  imagePrompt: string;
  setImagePrompt: (value: string) => void;
  generatedImagePreview: string | null;
  activeImageTab: string;
  setActiveImageTab: (tab: string) => void;
  showGenerationDialog: boolean;
  setShowGenerationDialog: (show: boolean) => void;
}

const FeaturedImageSection: React.FC<FeaturedImageSectionProps> = ({
  featuredImageUrl: propFeaturedImageUrl,
  onDeleteImage,
  onUploadImage,
  onGenerateImage,
  onApplyGeneratedImage,
  onSelectGalleryImage,
  isGenerating,
  isUploading,
  imagePrompt,
  setImagePrompt,
  generatedImagePreview,
  activeImageTab,
  setActiveImageTab,
  showGenerationDialog,
  setShowGenerationDialog
}) => {
  // Maintain local state for the featured image URL
  const [localFeaturedImageUrl, setLocalFeaturedImageUrl] = useState<string | null>(propFeaturedImageUrl);
  
  // Direct handler for selecting a gallery image
  const handleSelectGalleryImage = (imageUrl: string) => {
    console.log("FeaturedImageSection: handleSelectGalleryImage called with URL:", imageUrl);
    
    // Update local state immediately
    setLocalFeaturedImageUrl(imageUrl);
    console.log("FeaturedImageSection: local state updated with URL:", imageUrl);
    
    // Call the parent handler
    console.log("FeaturedImageSection: calling onSelectGalleryImage with URL:", imageUrl);
    onSelectGalleryImage(imageUrl);
    
    // Close the dialog immediately
    setShowGenerationDialog(false);
    console.log("FeaturedImageSection: dialog closed, image selection completed");
  };
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalFeaturedImageUrl(propFeaturedImageUrl);
  }, [propFeaturedImageUrl]);
  
  // Local handler for deleting the image
  const handleDeleteImage = async () => {
    setLocalFeaturedImageUrl(null);
    await onDeleteImage();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="min-w-[180px]"><Text color="secondary" variant="subheader-1">Обложка</Text></div>
      {localFeaturedImageUrl ? (
        <div className="relative featured-image-container flex flex-col items-start">
          <NextImage
            src={localFeaturedImageUrl}
            alt="Featured"
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: 'auto', height: 'auto', maxHeight: '15rem' }}
            className="max-h-60 rounded-lg object-contain mb-2"
            onError={(e) => console.error("Image failed to load:", localFeaturedImageUrl)}
          />
          <div className="flex gap-2">
            <Button
              size="l"
              view="outlined"
              onClick={() => setShowGenerationDialog(true)}
            >
              Generate
            </Button>
            <Button
              size="l"
              view="outlined-danger"
              onClick={handleDeleteImage}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="l"
            view="normal"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  onUploadImage(file);
                }
              };
              input.click();
            }}
          >
            Upload
          </Button>
          <Button
            size="l"
            view="outlined"
            onClick={() => setShowGenerationDialog(true)}
          >
            Generate
          </Button>
        </div>
      )}

      <ImageGenerationDialog
        showDialog={showGenerationDialog}
        setShowDialog={setShowGenerationDialog}
        activeTab={activeImageTab}
        setActiveTab={setActiveImageTab}
        imagePrompt={imagePrompt}
        setImagePrompt={setImagePrompt}
        generatedImagePreview={generatedImagePreview}
        isGenerating={isGenerating}
        isUploading={isUploading}
        onGenerateImage={onGenerateImage}
        onApplyGeneratedImage={() => {
          // Apply the generated image to our local state
          if (generatedImagePreview) {
            setLocalFeaturedImageUrl(generatedImagePreview);
            onApplyGeneratedImage();
          }
        }}
        onSelectGalleryImage={handleSelectGalleryImage}
      />
    </div>
  );
};

interface ImageGenerationDialogProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  generatedImagePreview: string | null;
  isGenerating: boolean;
  isUploading: boolean;
  onGenerateImage: () => Promise<void>;
  onApplyGeneratedImage: () => void;
  onSelectGalleryImage: (imageUrl: string) => void;
}

const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  showDialog,
  setShowDialog,
  activeTab,
  setActiveTab,
  imagePrompt,
  setImagePrompt,
  generatedImagePreview,
  isGenerating,
  isUploading,
  onGenerateImage,
  onApplyGeneratedImage,
  onSelectGalleryImage
}) => {
  const { toast } = useToast();
  return (
    <Modal open={showDialog} onClose={() => setShowDialog(false)}>
      <div className='modal-content'>
        <div className='top-modal'>
          <Text variant="subheader-3">Изображение для обложки</Text>
          <Button size='xl' view='flat' onClick={() => setShowDialog(false)}>
            <Icon data={Xmark} size={18} />
          </Button>
        </div>

        <Tabs defaultValue="prompt" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Генерация</TabsTrigger>
            <TabsTrigger value="gallery">Галерея</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div>
              <Text variant="body-1" className="block mb-2">
                Опишите желаемое изображение
              </Text>
              <TextArea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Например: узор из цветных пастельных суккулентов разных сортов, hd full wallpaper, четкий фокус, множество сложных деталей, глубина кадра, вид сверху"
                rows={5}
              />
            </div>

            {generatedImagePreview && (
              <div className="mt-4">
                <Text variant="body-1" className="block mb-2">Предпросмотр:</Text>
                <div className="relative">
                  <NextImage
                    src={generatedImagePreview}
                    alt="Generated preview"
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: '100%', height: 'auto' }}
                    className="w-full h-auto rounded-lg"
                  />
                  <Button
                    view="normal-contrast"
                    size="m"
                    className="absolute top-2 right-2 bg-background/70 hover:bg-background"
                    onClick={onGenerateImage}
                  >
                    Сгенерировать заново
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button view="outlined" size="l" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              {generatedImagePreview ? (
                <Button view="action" size="l" onClick={onApplyGeneratedImage}>
                  Apply
                </Button>
              ) : (
                <Button
                  view="action"
                  size="l"
                  onClick={onGenerateImage}
                  disabled={isGenerating || isUploading || !imagePrompt.trim()}
                  loading={isGenerating}
                >
                  {(isGenerating || isUploading) ? (
                    <>
                      <span className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                      {isGenerating ? "Генерация..." : "Сохранение..."}
                    </>
                  ) : "Сгенерировать"}
                </Button>
              )}
            </DialogFooter>
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <Text variant="body-1" className="block mb-4">Выберите изображение из галереи:</Text>
            <div className="gallery-container" style={{ minHeight: "300px" }}>
              <StoredImageGallery
                onImageSelect={onSelectGalleryImage}
              />
            </div>
            <DialogFooter>
              <Button
                view="action"
                size="l"
                onClick={() => setShowDialog(false)}
              >
                Закрыть
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
};

export default FeaturedImageSection;

