
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Text, Flex } from "@gravity-ui/uikit";
import Image from "next/image";

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
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
            size="l"
            view="outlined"
            onClick={() => router.push(`/edit-post/${postId}`)}
          >
            Редактировать
          </Button>
          
          <Button size="l" view="outlined-danger" onClick={() => setIsDeleteModalOpen(true)}>
            Удалить
          </Button>
          
          <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
            <div style={{ padding: '24px', minWidth: '400px' }}>
              <Text variant="header-2" style={{ marginBottom: '16px' }}>
                Вы уверены?
              </Text>
              <Text color="secondary" style={{ marginBottom: '24px' }}>
                Это действие нельзя отменить. Статья будет безвозвратно удалена.
              </Text>
              <Flex direction="row" justifyContent="flex-end" gap={2}>
                <Button view="outlined" onClick={() => setIsDeleteModalOpen(false)}>
                  Отмена
                </Button>
                <Button view="action" onClick={async () => {
                  await onDelete();
                  setIsDeleteModalOpen(false);
                }}>
                  Удалить
                </Button>
              </Flex>
            </div>
          </Modal>
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
