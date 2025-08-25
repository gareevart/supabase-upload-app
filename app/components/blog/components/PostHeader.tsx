
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@gravity-ui/uikit";
import Image from "next/image";
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
  const router = useRouter();
  
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          {authorProfile?.avatar_url ? (
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <Image
                src={authorProfile.avatar_url}
                alt={authorProfile.name || ""}
                fill
                className="rounded-full object-cover"
                sizes="32px"
              />
            </div>
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
            onClick={() => router.push(`/edit-post/${postId}`)}
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
        <div className="mb-6" style={{ position: 'relative', width: '100%', height: '384px' }}>
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="rounded-lg object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
    </div>
  );
};
