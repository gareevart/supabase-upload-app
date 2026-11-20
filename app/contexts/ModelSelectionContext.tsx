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

  // Сохраняем выбранную модель в localStorage при каждом изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [selectedModel]);

  return (
    <ModelSelectionContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        availableModels,
        modelsLoading,
        modelsError,
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
