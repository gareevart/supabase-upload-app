
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@gravity-ui/uikit";

interface PostErrorProps {
  error: string | null;
}

export const PostError: React.FC<PostErrorProps> = ({ error }) => {
  const navigate = useNavigate();
  
  return (
    <div className="py-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Статья не найдена</h2>
      <p className="text-gray-500 mb-6">{error || "Запрашиваемая статья не существует."}</p>
      <Button onClick={() => navigate("/blog")}>Вернуться к списку статей</Button>
    </div>
  );
};
