
import { useState, useEffect } from "react";

export type ModelType = "yandexgpt" | "deepseek" | "gpt-oss-20b";

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    // Получаем сохраненную модель из localStorage или используем YandexGPT по умолчанию
    const savedModel = localStorage.getItem("selectedModel");
    return (savedModel as ModelType) || "yandexgpt";
  });

  const [reasoningMode, setReasoningMode] = useState<boolean>(() => {
    // Получаем сохраненное состояние режима рассуждений из localStorage
    const savedReasoningMode = localStorage.getItem("reasoningMode");
    return savedReasoningMode === "true";
  });

  // Сохраняем выбранную модель в localStorage при каждом изменении
  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  // Сохраняем состояние режима рассуждений в localStorage при каждом изменении
  useEffect(() => {
    localStorage.setItem("reasoningMode", reasoningMode.toString());
  }, [reasoningMode]);

  return { 
    selectedModel, 
    setSelectedModel, 
    reasoningMode, 
    setReasoningMode 
  };
};
