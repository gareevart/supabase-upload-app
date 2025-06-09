
import React, { useState } from "react";
import { Button, Text, TextArea } from '@gravity-ui/uikit';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/app/components/ui/tabs";
import StoredImageGallery from "../StoredImageGallery";

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
  featuredImageUrl,
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
  return (
    <div className="flex gap-2">
      <div className="w-[200px]"><Text color="secondary" variant="subheader-1">Главное изображение</Text></div>
      {featuredImageUrl ? (
        <div className="relative">
          <img
            src={featuredImageUrl}
            alt="Featured"
            className="max-h-60 object-contain mx-auto mb-2"
          />
          <div className="flex gap-2">
            <Button
              size="l"
              view="outlined"
              onClick={() => setShowGenerationDialog(true)}
            >
              Сгенерировать
            </Button>
            <Button
              size="l"
              view="outlined-danger"
              onClick={onDeleteImage}
            >
              Удалить
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
            Загрузить изображение
          </Button>
          <Button
            size="l"
            view="outlined"
            onClick={() => setShowGenerationDialog(true)}
          >
            Сгенерировать
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
        onApplyGeneratedImage={onApplyGeneratedImage}
        onSelectGalleryImage={onSelectGalleryImage}
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
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Изображение для обложки</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="prompt" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Генерация</TabsTrigger>
            <TabsTrigger value="gallery">Галерея</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Опишите желаемое изображение
              </label>
              <TextArea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Например: узор из цветных пастельных суккулентов разных сортов, hd full wallpaper, четкий фокус, множество сложных деталей, глубина кадра, вид сверху"
                rows={5}
              />
            </div>

            {generatedImagePreview && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Предпросмотр:</p>
                <div className="relative">
                  <img
                    src={generatedImagePreview}
                    alt="Generated preview"
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

            <div className="flex justify-end gap-2 mt-4">
              <Button view="outlined" size="l" onClick={() => setShowDialog(false)}>
                Отмена
              </Button >
              {generatedImagePreview ? (
                <Button view="action" size="l" onClick={onApplyGeneratedImage}>
                  Применить
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
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <p className="text-sm mb-4">Выберите изображение из галереи:</p>
            <StoredImageGallery onImageSelect={onSelectGalleryImage} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedImageSection;
