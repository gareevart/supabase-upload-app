
import React, { useState } from 'react';
import { Button, TextArea, Modal, Text, Flex } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";
import { MagicWand, Comment, Circle } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useYandexGPT } from "@/hooks/useYandexGPT";

interface YandexGPTTextGeneratorProps {
  onTextGenerated: (text: string) => void;
  initialText?: string;
}

const YandexGPTTextGenerator = ({ onTextGenerated, initialText = '' }: YandexGPTTextGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState(initialText);
  const [activeTab, setActiveTab] = useState('generate');
  
  const { generateText, improveText, isGenerating, error } = useYandexGPT();
  const { toast } = useToast();

  const handleGenerateText = async () => {
    if (!prompt.trim() && activeTab === 'generate') {
      toast({
        title: 'Введите запрос',
        description: 'Для генерации текста необходимо ввести запрос',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = activeTab === 'generate' 
        ? await generateText(prompt)
        : await improveText(text);

      if (result.error) {
        toast({
          title: 'Ошибка',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setText(result.text);
    } catch (error) {
      console.error('Ошибка при работе с YandexGPT:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла ошибка при обработке запроса',
        variant: 'destructive',
      });
    }
  };

  const handleApply = () => {
    if (text.trim()) {
      onTextGenerated(text);
      setOpen(false);
      toast({
        title: 'Текст добавлен',
        description: 'Сгенерированный текст успешно добавлен в пост',
      });
    }
  };

  return (
    <>
      <Button 
        view="outlined" 
        size="m" 
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Icon data={MagicWand} size={16} />
        YandexGPT
      </Button>
      
      <Modal open={open} onClose={() => setOpen(false)}>
        <div style={{ padding: '24px', minWidth: '600px', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
          <Text variant="header-2" style={{ marginBottom: '24px' }}>
            Генерация текста с помощью YandexGPT
          </Text>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <Button
                view={activeTab === 'generate' ? 'normal' : 'flat'}
                size="m"
                onClick={() => setActiveTab('generate')}
              >
                <Icon data={Comment} size={16} />
                Генерация текста
              </Button>
              <Button
                view={activeTab === 'improve' ? 'normal' : 'flat'}
                size="m"
                onClick={() => setActiveTab('improve')}
              >
                <Icon data={Circle} size={16} />
                Улучшение текста
              </Button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {activeTab === 'generate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
                  <div>
                    <Text variant="body-1" style={{ marginBottom: '8px' }}>Запрос для генерации:</Text>
                    <TextArea
                      placeholder="Опишите, какой текст вы хотите получить. Например: Напиши введение для статьи о преимуществах низкоуглеводной диеты."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Text variant="body-1" style={{ marginBottom: '8px' }}>Сгенерированный текст:</Text>
                    <TextArea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{ flex: 1, minHeight: '200px' }}
                      placeholder="Здесь появится сгенерированный текст..."
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'improve' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Text variant="body-1" style={{ marginBottom: '8px' }}>Текст для улучшения:</Text>
                  <TextArea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ flex: 1, minHeight: '200px' }}
                    placeholder="Вставьте текст, который хотите улучшить..."
                  />
                </div>
              )}
            </div>
          </div>
          
          <Flex direction="row" justifyContent="space-between" style={{ marginTop: '24px' }}>
            <Flex direction="row" gap={2}>
              <Button 
                view="outlined" 
                onClick={() => setOpen(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleGenerateText}
                disabled={isGenerating}
                view="outlined-info"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-current animate-spin"></span>
                    Обработка...
                  </>
                ) : activeTab === 'generate' ? 'Генерировать' : 'Улучшить'}
              </Button>
            </Flex>
            <Button
              onClick={handleApply}
              disabled={!text.trim()}
              view="action"
            >
              Применить
            </Button>
          </Flex>
        </div>
      </Modal>
    </>
  );
};

export default YandexGPTTextGenerator;
