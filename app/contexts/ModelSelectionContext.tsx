"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ModelType = string;

const FALLBACK_MODEL = "gpt-oss:20b";

interface ModelSelectionContextType {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  availableModels: string[];
  modelsLoading: boolean;
  modelsError: string | null;
  reasoningMode: boolean;
  setReasoningMode: (enabled: boolean) => void;
}

const ModelSelectionContext = createContext<ModelSelectionContextType | undefined>(undefined);

interface ModelSelectionProviderProps {
  children: ReactNode;
}

export const ModelSelectionProvider = ({ children }: ModelSelectionProviderProps) => {
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
      if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem("selectedModel");
      return savedModel && !savedModel.startsWith("yandex") ? savedModel : FALLBACK_MODEL;
    }
    return FALLBACK_MODEL;
  });

  const [availableModels, setAvailableModels] = useState<string[]>([FALLBACK_MODEL]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ollama/models")
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить модели Ollama");
        return response.json();
      })
      .then(({ models }: { models?: string[] }) => {
        if (!cancelled && models?.length) {
          setAvailableModels(models);
          setSelectedModel((current) => models.includes(current) ? current : models[0]);
        }
      })
      .catch((error) => {
        if (!cancelled) setModelsError(error instanceof Error ? error.message : "Ошибка загрузки моделей");
      })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [reasoningMode, setReasoningMode] = useState<boolean>(() => {
    // Получаем сохраненное состояние режима рассуждений из localStorage
    if (typeof window !== 'undefined') {
      const savedReasoningMode = localStorage.getItem("reasoningMode");
      return savedReasoningMode === "true";
    }
    return false;
  });

  // Сохраняем выбранную модель в localStorage при каждом изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [selectedModel]);

  // Сохраняем состояние режима рассуждений в localStorage при каждом изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("reasoningMode", reasoningMode.toString());
    }
  }, [reasoningMode]);

  // Автоматически отключаем режим рассуждений при переключении с YandexGPT
  useEffect(() => {
    if (selectedModel !== 'yandexgpt' && reasoningMode) {
      setReasoningMode(false);
    }
  }, [selectedModel, reasoningMode]);

  return (
    <ModelSelectionContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        availableModels,
        modelsLoading,
        modelsError,
        reasoningMode,
        setReasoningMode,
      }}
    >
      {children}
    </ModelSelectionContext.Provider>
  );
};

export const useModelSelection = () => {
  const context = useContext(ModelSelectionContext);
  if (context === undefined) {
    throw new Error('useModelSelection must be used within a ModelSelectionProvider');
  }
  return context;
};
