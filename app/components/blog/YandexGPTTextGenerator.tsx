
import React, { useState } from 'react';
import { Button } from '@gravity-ui/uikit';
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wand2, MessageSquare, Sparkles } from 'lucide-react';
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
        variant="outline" 
        size="m" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Wand2 className="h-4 w-4" />
        YandexGPT
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Генерация текста с помощью YandexGPT</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">
                <MessageSquare className="h-4 w-4 mr-2" />
                Генерация текста
              </TabsTrigger>
              <TabsTrigger value="improve">
                <Sparkles className="h-4 w-4 mr-2" />
                Улучшение текста
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 flex flex-col overflow-hidden mt-4">
              <TabsContent value="generate" className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Запрос для генерации:</label>
                  <Textarea 
                    placeholder="Опишите, какой текст вы хотите получить. Например: Напиши введение для статьи о преимуществах низкоуглеводной диеты."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <div className="flex-1 space-y-2 overflow-hidden flex flex-col">
                  <label className="text-sm font-medium">Сгенерированный текст:</label>
                  <Textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 min-h-0"
                    placeholder="Здесь появится сгенерированный текст..."
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="improve" className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex-1 space-y-2 overflow-hidden flex flex-col">
                  <label className="text-sm font-medium">Текст для улучшения:</label>
                  <Textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 min-h-0"
                    placeholder="Вставьте текст, который хотите улучшить..."
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="flex justify-between">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleGenerateText}
                disabled={isGenerating}
                variant="secondary"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-current animate-spin"></span>
                    Обработка...
                  </>
                ) : activeTab === 'generate' ? 'Генерировать' : 'Улучшить'}
              </Button>
            </div>
            <Button
              onClick={handleApply}
              disabled={!text.trim()}
            >
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YandexGPTTextGenerator;
