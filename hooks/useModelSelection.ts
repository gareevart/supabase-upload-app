
import { useState, useEffect } from "react";

export type ModelType = "yandexgpt" | "deepseek";

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    // Получаем сохраненную модель из localStorage или используем YandexGPT по умолчанию
    const savedModel = localStorage.getItem("selectedModel");
    return (savedModel as ModelType) || "yandexgpt";
  });

  // Сохраняем выбранную модель в localStorage при каждом изменении
  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  return { selectedModel, setSelectedModel };
};
