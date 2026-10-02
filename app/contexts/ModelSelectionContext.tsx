"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  CHAT_MODEL_IDS,
  DEFAULT_CHAT_MODEL,
  normalizeChatModel,
} from "@/lib/chatModels";

export type ModelType = string;

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
      return normalizeChatModel(savedModel) || DEFAULT_CHAT_MODEL;
    }
    return DEFAULT_CHAT_MODEL;
  });

  const availableModels: string[] = [...CHAT_MODEL_IDS];
  const modelsLoading = false;
  const modelsError: string | null = null;

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
