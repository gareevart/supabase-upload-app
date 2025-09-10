"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ModelType = "yandexgpt" | "deepseek" | "gpt-oss-20b";

interface ModelSelectionContextType {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
  reasoningMode: boolean;
  setReasoningMode: (enabled: boolean) => void;
}

const ModelSelectionContext = createContext<ModelSelectionContextType | undefined>(undefined);

interface ModelSelectionProviderProps {
  children: ReactNode;
}

export const ModelSelectionProvider = ({ children }: ModelSelectionProviderProps) => {
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    // Получаем сохраненную модель из localStorage или используем YandexGPT по умолчанию
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem("selectedModel");
      return (savedModel as ModelType) || "yandexgpt";
    }
    return "yandexgpt";
  });

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
      console.log('ModelSelectionContext: Model changed to:', selectedModel);
    }
  }, [selectedModel]);

  // Сохраняем состояние режима рассуждений в localStorage при каждом изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("reasoningMode", reasoningMode.toString());
      console.log('ModelSelectionContext: Reasoning mode changed to:', reasoningMode);
    }
  }, [reasoningMode]);

  // Автоматически отключаем режим рассуждений при переключении с YandexGPT
  useEffect(() => {
    if (selectedModel !== 'yandexgpt' && reasoningMode) {
      console.log('ModelSelectionContext: Auto-disabling reasoning mode for non-YandexGPT model');
      setReasoningMode(false);
    }
  }, [selectedModel, reasoningMode]);

  return (
    <ModelSelectionContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
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
