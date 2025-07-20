"use client";

import React, { useState, useCallback } from 'react';
import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { Button, TextArea, Card, Text, Alert, Spin, Flex, Icon } from '@gravity-ui/uikit';
import { Picture, ArrowUpRightFromSquare, Xmark } from '@gravity-ui/icons';
import { useRouter } from 'next/navigation';

const ImageGeneratorComponent: React.FC<ReactNodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
}) => {
  const [prompt, setPrompt] = useState(node.attrs.prompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(node.attrs.generatedImageUrl || '');
  
  const router = useRouter();

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    updateAttributes({ prompt: newPrompt });
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Пожалуйста, введите описание изображения');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        updateAttributes({ 
          prompt,
          generatedImageUrl: data.imageUrl 
        });
      } else {
        throw new Error('Не получен URL изображения');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
      setError(`Не удалось сгенерировать изображение: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryThisPrompt = () => {
    if (!prompt.trim()) {
      setError('Пожалуйста, введите описание изображения');
      return;
    }
    
    // Открываем страницу yaart с предзаполненным промптом
    const encodedPrompt = encodeURIComponent(prompt);
    router.push(`/yaart?prompt=${encodedPrompt}`);
  };

  const handleInsertImage = () => {
    if (!generatedImageUrl) return;
    
    // Получаем редактор из контекста и вставляем изображение
    const editor = (window as any).currentTipTapEditor;
    if (editor) {
      // Удаляем текущий узел генератора
      deleteNode();
      
      // Вставляем изображение
      editor.chain().focus().setImage({
        src: generatedImageUrl,
        alt: prompt
      }).run();
    }
  };

  return (
    <NodeViewWrapper className="image-generator-wrapper">
      <Card className="image-generator-card" style={{ margin: '16px 0' }}>
        <div style={{ padding: '16px' }}>
          <Flex direction="row" alignItems="center" justifyContent="space-between" style={{ marginBottom: '12px' }}>
            <Flex direction="row" alignItems="center" gap={2}>
              <Icon data={Picture} size={18} />
              <Text variant="subheader-2">Генератор изображений</Text>
            </Flex>
            <Button
              view="flat"
              size="s"
              onClick={deleteNode}
            >
              <Icon data={Xmark} size={16} />
            </Button>
          </Flex>

          <Text variant="body-2" color="secondary" style={{ marginBottom: '12px' }}>
            Введите описание изображения, которое хотите сгенерировать
          </Text>

          <TextArea
            placeholder="Например: красивый закат над горами, реалистичный стиль..."
            value={prompt}
            onChange={handlePromptChange}
            rows={3}
            maxRows={6}
            style={{ width: '100%', marginBottom: '12px' }}
          />

          {error && (
            <Alert
              theme="danger"
              message={error}
              onClose={() => setError('')}
              style={{ marginBottom: '12px' }}
            />
          )}

          <Flex direction="row" gap={2} style={{ marginBottom: '12px' }}>
            <Button
              view="action"
              size="m"
              onClick={handleGenerateImage}
              disabled={isGenerating || !prompt.trim()}
              loading={isGenerating}
            >
              {isGenerating ? 'Генерируем...' : 'Сгенерировать изображение'}
            </Button>
            
            <Button
              view="outlined"
              size="m"
              onClick={handleTryThisPrompt}
              disabled={!prompt.trim()}
            >
              <Icon data={ArrowUpRightFromSquare} size={16} />
              Try this prompt
            </Button>
          </Flex>

          {isGenerating && (
            <Flex justifyContent="center" alignItems="center" style={{ padding: '20px' }}>
              <Flex direction="column" alignItems="center" gap={2}>
                <Spin size="m" />
                <Text variant="body-2" color="secondary">Генерируем изображение...</Text>
              </Flex>
            </Flex>
          )}

          {generatedImageUrl && !isGenerating && (
            <div style={{ marginTop: '12px' }}>
              <Text variant="body-2" color="secondary" style={{ marginBottom: '8px' }}>
                Сгенерированное изображение:
              </Text>
              <div style={{ 
                border: '1px solid var(--g-color-line-generic)', 
                borderRadius: '8px', 
                padding: '8px',
                marginBottom: '12px'
              }}>
                <img 
                  src={generatedImageUrl} 
                  alt={prompt}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    borderRadius: '4px'
                  }} 
                />
              </div>
              <Flex direction="row" gap={2}>
                <Button
                  view="action"
                  size="m"
                  onClick={handleInsertImage}
                >
                  Вставить в статью
                </Button>
                <Button
                  view="outlined"
                  size="m"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImageUrl;
                    link.download = 'generated-image.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Скачать
                </Button>
              </Flex>
            </div>
          )}
        </div>
      </Card>
    </NodeViewWrapper>
  );
};

export default ImageGeneratorComponent;
