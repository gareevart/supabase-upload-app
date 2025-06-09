
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@gravity-ui/uikit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

interface PostHeaderProps {
  title: string;
  created_at: string;
  authorName: string;
  authorProfile: {
    avatar_url?: string;
    name?: string;
  } | null;
  isAuthor: boolean;
  postId: string;
  onDelete: () => Promise<void>;
  featuredImage?: string | null;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  title,
  created_at,
  authorName,
  authorProfile,
  isAuthor,
  postId,
  onDelete,
  featuredImage,
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          {authorProfile?.avatar_url ? (
            <img
              src={authorProfile.avatar_url}
              alt={authorProfile.name || ""}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              {authorProfile?.name?.charAt(0) || "?"}
            </div>
          )}
          <span className="text-foreground">
            {authorName}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(created_at).toLocaleDateString("ru-RU")}
        </div>
      </div>

      {/* Action Buttons for Author */}
      {isAuthor && (
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-post/${postId}`)}
          >
            Редактировать
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Удалить</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Статья будет безвозвратно удалена.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Featured Image */}
      {featuredImage && (
        <div className="mb-6">
          <img
            src={featuredImage}
            alt={title}
            className="w-full rounded-lg object-cover max-h-96"
          />
        </div>
      )}
    </div>
  );
};
