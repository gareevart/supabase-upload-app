"use client" 
import React from 'react';
import { Flex, Text, Button, Alert, Spin, TextArea, useToaster } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/yandexStorage';

const Yaart = () => {
    const [prompt, setPrompt] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [generatedImage, setGeneratedImage] = React.useState('');
    const [imageData, setImageData] = React.useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
    const [canGenerate, setCanGenerate] = React.useState(true);
    const [showLimitWarning, setShowLimitWarning] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');
    const [saveSuccess, setSaveSuccess] = React.useState(false);
    const toaster = useToaster();
    
    React.useEffect(() => {
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
        
        if (!user) {
          // Проверяем лимит для неавторизованных пользователей
          const lastGeneration = localStorage.getItem('last_image_generation');
          if (lastGeneration) {
            const lastDate = new Date(lastGeneration);
            const today = new Date();
            const isSameDay = lastDate.toDateString() === today.toDateString();
            
            if (isSameDay) {
              setCanGenerate(false);
              setShowLimitWarning(true);
            }
          }
        }
      };
      
      checkAuth();
    }, []);
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    };
    
    const handleGenerateImage = async () => {
      if (!prompt.trim()) {
        setError('Please enter a prompt for image generation');
        return;
      }
      
      // Проверяем ограничения для неавторизованных пользователей
      if (!isAuthenticated && !canGenerate) {
        setError('Daily limit reached. Please sign in to generate more images or try again tomorrow.');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: prompt })
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.imageUrl) {
          setGeneratedImage(data.imageUrl);
          setImageData(data.imageData || null);
          setSaveSuccess(false); // Reset save success state
          
          // Сохраняем время генерации для неавторизованных пользователей
          if (!isAuthenticated) {
            localStorage.setItem('last_image_generation', new Date().toISOString());
            setCanGenerate(false);
            setShowLimitWarning(true);
          }
        } else {
          throw new Error('No image URL in response');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to generate image: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    // Function to save the generated image to the user's gallery
    const handleSaveToGallery = async () => {
      if (!isAuthenticated) {
        setError('Для сохранения изображения необходимо авторизоваться');
        return;
      }
      
      if (!generatedImage) {
        setError('Нет изображения для сохранения');
        return;
      }
      
      setIsSaving(true);
      setSaveError('');
      setSaveSuccess(false);
      
      try {
        // Get user ID from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        
        if (!userId) {
          throw new Error('Не удалось получить ID пользователя');
        }
        
        // Create a File object from the image data or URL
        let imageFile: File;
        
        if (imageData) {
          // Convert data URL to blob
          const response = await fetch(imageData);
          const blob = await response.blob();
          imageFile = new File([blob], `generated-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
        } else {
          // Fallback to using the image URL
          const response = await fetch(generatedImage);
          const blob = await response.blob();
          imageFile = new File([blob], `generated-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        
        // Add metadata with the prompt (encode to avoid invalid characters in headers)
        const metadata = {
          prompt: encodeURIComponent(prompt),
          generatedAt: new Date().toISOString(),
          source: 'yaart'
        };
        
        // Upload the file
        const { error: uploadError, data } = await uploadFile(
          imageFile,
          `profiles/${userId}`,
          userId,
          metadata
        );
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Trigger the fileUploaded event to refresh the gallery
        const fileUploadedEvent = new CustomEvent('fileUploaded');
        window.dispatchEvent(fileUploadedEvent);
        
        // Show success message
        setSaveSuccess(true);
        toaster.add({
          name: 'save-success',
          title: 'Успешно!',
          content: 'Изображение сохранено в галерею',
          theme: 'success',
          autoHiding: 5000
        });
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при сохранении изображения';
        setSaveError(errorMessage);
        toaster.add({
          name: 'save-error',
          title: 'Ошибка!',
          content: errorMessage,
          theme: 'danger',
          autoHiding: 10000
        });
      } finally {
        setIsSaving(false);
      }
    };
    
    return (
        <div className="page-container">
          <div className="content-container">
            <Flex direction="column" gap={2}>
              <Text variant="display-1">Image Generator</Text>
              
              {showLimitWarning && !isAuthenticated && (
                <Alert 
                  theme="warning" 
                  message="Users without authorization can generate only one image per day. Please log in for unlimited access"
                  onClose={() => setShowLimitWarning(false)}
                />
              )}
              
              <Flex direction="column" gap={4}>
                <Text variant="body-1">Enter a prompt to generate an image</Text>
                <TextArea
                  placeholder="Enter a detailed description of the image you want to generate..."
                  value={prompt}
                  onChange={handlePromptChange}
                  rows={4}
                  maxRows={8}
                  style={{ width: '100%' }}
                />
              </Flex>
              
              <Flex justifyContent="flex-end">
                <Button
                  view="action"
                  size="l"
                  onClick={handleGenerateImage}
                  disabled={loading || !prompt.trim() || (!isAuthenticated && !canGenerate)}
                  loading={loading}
                >
                  Generate Image
                </Button>
              </Flex>
              
              {error && (
                <Alert 
                  theme="danger" 
                  message={error} 
                  onClose={() => setError('')}
                />
              )}
              
              {loading && (
                <Flex justifyContent="center" alignItems="center" style={{ padding: '40px' }}>
                  <Flex direction="column" alignItems="center" gap={10}>
                    <Spin size="xl" />
                    <Text>Generating your image...</Text>
                  </Flex>
                </Flex>
              )}
              
              {generatedImage && !loading && (
                <Flex direction="column" gap={10}>
                  <Text variant="body-1" color="secondary">Generated Image:</Text>
                  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px' }}>
                    <img 
                      src={generatedImage} 
                      alt="Generated from prompt" 
                      style={{ maxWidth: '100%', height: 'auto' }} 
                    />
                  </div>
                  <Flex justifyContent="flex-end" gap={2}>
                    <Button
                      view="outlined"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = 'generated-image.jpg';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      Download Image
                    </Button>
                    
                    {isAuthenticated && (
                      <Button
                        view="action"
                        onClick={handleSaveToGallery}
                        loading={isSaving}
                        disabled={isSaving || saveSuccess}
                      >
                        {saveSuccess ? 'Saved to gallery' : 'Save to my gallery'}
                      </Button>
                    )}
                  </Flex>
                  
                  {saveError && (
                    <Alert
                      theme="danger"
                      message={saveError}
                      onClose={() => setSaveError('')}
                    />
                  )}
                  
                  {saveSuccess && (
                    <Alert
                      theme="success"
                      message="Изображение успешно сохранено в вашу галерею"
                      onClose={() => setSaveSuccess(false)}
                    />
                  )}
                </Flex>
              )}
            </Flex>
          </div>
        </div>
    );
  };
  export default Yaart;
