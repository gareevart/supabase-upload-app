"use client"
import React from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Flex, Text, Button, Alert, Spin, Label, TextArea, useToaster, Skeleton } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import CustomBreadcrumbs from '@/app/components/Breadcrumbs/Breadcrumbs';
import { uploadFile } from '@/lib/yandexStorage';

type ProfileWithQuota = {
  id: string;
  daily_image_quota_remaining: number;
  quota_last_updated: string;
};

const Yaart = () => {
  const segmentLabels = {
    'projects': 'Projects',
    'yaart': 'Image Generator'
  };
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [generatedImage, setGeneratedImage] = React.useState('');
  const [imageData, setImageData] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [canGenerate, setCanGenerate] = React.useState(true);
  const [showLimitWarning, setShowLimitWarning] = React.useState(false);
  const [remainingGenerations, setRemainingGenerations] = React.useState(10);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const toaster = useToaster();

  // Получаем промпт из URL параметров при загрузке компонента
  React.useEffect(() => {
    const urlPrompt = searchParams?.get('prompt');
    if (urlPrompt) {
      setPrompt(decodeURIComponent(urlPrompt));
    }
  }, [searchParams]);

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          const profile = data as unknown as ProfileWithQuota;
          const today = new Date().toISOString().split('T')[0];
          const lastUpdated = new Date(profile.quota_last_updated).toISOString().split('T')[0];

          let remaining = profile.daily_image_quota_remaining;
          if (lastUpdated !== today) {
            remaining = 10; // Reset quota if new day
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                daily_image_quota_remaining: 10,
                quota_last_updated: new Date().toISOString()
              } as unknown as Partial<ProfileWithQuota>)
              .eq('id', user.id);
            if (updateError) console.error('Failed to reset quota:', updateError);
          }

          setRemainingGenerations(remaining);
          setCanGenerate(remaining > 0);
          setShowLimitWarning(remaining <= 0);
        } catch (err) {
          console.error('Error checking quota:', err);
          // Fallback to localStorage if Supabase fails
          const quotaKey = `yaart_quota_${user.id}`;
          const quotaData = localStorage.getItem(quotaKey);
          const today = new Date().toISOString().split('T')[0];

          let remaining = 10;
          if (quotaData) {
            const { lastUpdated, count } = JSON.parse(quotaData);
            if (lastUpdated.split('T')[0] === today) {
              remaining = 10 - count;
            }
          }

          setRemainingGenerations(remaining);
          setCanGenerate(remaining > 0);
          setShowLimitWarning(remaining <= 0);
        }
      } else {
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
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setImageData(data.imageData || null);
        setSaveSuccess(false);

        if (isAuthenticated) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

              if (error) throw error;

              const profile = data as unknown as ProfileWithQuota;
              const today = new Date().toISOString().split('T')[0];
              const lastUpdated = new Date(profile.quota_last_updated).toISOString().split('T')[0];

              let newQuota = profile.daily_image_quota_remaining - 1;
              if (lastUpdated !== today) {
                newQuota = 9; // Reset quota if new day
              }

              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  daily_image_quota_remaining: newQuota,
                  quota_last_updated: new Date().toISOString()
                } as unknown as Partial<ProfileWithQuota>)
                .eq('id', user.id);

              if (!updateError) {
                setRemainingGenerations(newQuota);
                setCanGenerate(newQuota > 0);
                setShowLimitWarning(newQuota <= 0);
              } else {
                console.error('Failed to update quota:', updateError);
              }
            } catch (err) {
              console.error('Error updating quota:', err);
              // Fallback to localStorage if Supabase fails
              const quotaKey = `yaart_quota_${user.id}`;
              const quotaData = localStorage.getItem(quotaKey);
              const today = new Date().toISOString().split('T')[0];

              let newCount = 1;
              if (quotaData) {
                const { lastUpdated, count } = JSON.parse(quotaData);
                newCount = lastUpdated.split('T')[0] === today ? count + 1 : 1;
              }

              localStorage.setItem(quotaKey, JSON.stringify({
                lastUpdated: new Date().toISOString(),
                count: newCount
              }));

              setRemainingGenerations(10 - newCount);
              setCanGenerate(newCount < 10);
              setShowLimitWarning(newCount >= 10);
            }
          }
        } else {
          localStorage.setItem('last_image_generation', new Date().toISOString());
          setCanGenerate(false);
          setShowLimitWarning(true);
        }
      } else {
        throw new Error('No image URL in response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to generate image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) throw new Error('Не удалось получить ID пользователя');

      let imageFile: File;
      if (imageData) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        imageFile = new File([blob], `generated-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
      } else {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        imageFile = new File([blob], `generated-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
      }

      const metadata = {
        prompt: encodeURIComponent(prompt),
        generatedAt: new Date().toISOString(),
        source: 'yaart'
      };

      const { error: uploadError } = await uploadFile(
        imageFile,
        `profiles/${userId}`,
        userId,
        metadata
      );

      if (uploadError) throw uploadError;

      window.dispatchEvent(new CustomEvent('fileUploaded'));

      setSaveSuccess(true);
      toaster.add({
        name: 'save-success',
        title: 'Успешно!',
        content: 'Изображение сохранено в галерею',
        theme: 'success',
        autoHiding: 5000
      });
    } catch (err) {
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
    <div className="min-h-screen">
      <main className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="flex flex-col gap-6">
          <CustomBreadcrumbs segmentLabels={segmentLabels} />
          <Flex direction="column" gap={2}>
            <Text variant="display-1">Image Generator</Text>

            {showLimitWarning && (
              <Alert
                theme="warning"
                message={
                  isAuthenticated
                    ? `You've reached your daily limit of 10 image generations. Try again tomorrow.`
                    : "Users without authorization can generate only one image per day. Please log in for more"
                }
                onClose={() => setShowLimitWarning(false)}
              />
            )}

            {isAuthenticated === null ? (
              <Skeleton style={{ width: '100%', height: '28px' }} />
            ) : isAuthenticated ? (
              <Label size="m" theme="normal">Daily limit: {remainingGenerations}/10</Label>
            ) : null}

            <Flex direction="column" gap={4}>
              <TextArea
                placeholder="Enter a detailed description of the image you want to generate..."
                value={prompt}
                onChange={handlePromptChange}
                rows={4}
                maxRows={8}
                style={{ width: '100%' }}
              />
            </Flex>

            <Flex justifyContent="flex-start">
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
                  <Text>Generating image...</Text>
                </Flex>
              </Flex>
            )}

            {generatedImage && !loading && (
              <Flex direction="column" gap={10}>
                <Text variant="body-1" color="secondary">Generated Image:</Text>
                <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', position: 'relative', width: '100%', minHeight: '400px' }}>
                  <Image
                    src={generatedImage}
                    alt="Generated from prompt"
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
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
      </main>
    </div>
  );
};

export default Yaart;
