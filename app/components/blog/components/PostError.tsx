
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@gravity-ui/uikit";

interface PostErrorProps {
  error: string | null;
}

export const PostError: React.FC<PostErrorProps> = ({ error }) => {
  const router = useRouter();
  
  return (
    <div className="py-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Статья не найдена</h2>
      <p className="text-gray-500 mb-6">{error || "Запрашиваемая статья не существует."}</p>
      <Button onClick={() => router.push("/blog")}>Вернуться к списку статей</Button>
    </div>
  );
};
