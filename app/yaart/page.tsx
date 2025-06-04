"use client" 
import React from 'react';
import { Flex, Card, Text, Button, Alert, Spin, TextArea } from '@gravity-ui/uikit';

const Yaart = () => {
    const [prompt, setPrompt] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [generatedImage, setGeneratedImage] = React.useState('');
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    };
    
    const handleGenerateImage = async () => {
      if (!prompt.trim()) {
        setError('Please enter a prompt for image generation');
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
    
    return (
        <div className="grid grid-rows-[16px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Flex direction="column">
        <Card view="outlined" type="container">
          <Flex direction="column" gap={2}>
            <Text variant="display-1">Image Generator</Text>
            
            <Flex direction="column" gap={4}>
              <Text variant="body-1">Enter a prompt to generate an image</Text>
              <TextArea
                placeholder="Enter a detailed description of the image you want to generate..."
                value={prompt}
                onChange={handlePromptChange}
                rows={4}
                maxRows={8}
              />
            </Flex>
            
            <Flex justifyContent="flex-end">
              <Button
                view="action"
                size="l"
                onClick={handleGenerateImage}
                disabled={loading || !prompt.trim()}
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
                <Card view="outlined" type="container">
                  <img 
                    src={generatedImage} 
                    alt="Generated from prompt" 
                    style={{ maxWidth: '100%', height: 'auto' }} 
                  />
                </Card>
                <Flex justifyContent="flex-end">
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
                </Flex>
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>
      </main>
        </div>
    );
  };
  export default Yaart;
  