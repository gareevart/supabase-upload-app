import { useState } from "react";
import { Card, Skeleton, Pagination, Button } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBlogPosts, useAuth } from "@/shared/lib/hooks/useBlogPosts";
import { deleteBlogPost } from "@/shared/api/blog";
import { BlogPostCard } from "@/shared/ui/BlogPostCard";
import type { BlogPost } from "@/shared/ui/BlogPostCard";

interface PostListProps {
  onlyMyPosts?: boolean;
  publishedOnly?: boolean;
  draftsOnly?: boolean;
  gridView?: boolean;
}

export const PostList = ({
  onlyMyPosts = false,
  publishedOnly = false,
  draftsOnly = false,
  gridView = true
}: PostListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();
  const { userId } = useAuth();

  const POSTS_PER_PAGE = 10;

  // Используем хук с кэшированием через SWR
  const { posts, totalCount, isLoading, mutate } = useBlogPosts({
    publishedOnly,
    draftsOnly,
    onlyMyPosts,
    authorId: onlyMyPosts ? userId || undefined : undefined,
    page: currentPage,
    pageSize: POSTS_PER_PAGE,
  });

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот черновик? Это действие нельзя отменить.")) {
      return;
    }

    setDeletingPostId(postId);
    
    try {
      await deleteBlogPost(postId);
      
      // Обновляем кэш после удаления
      mutate();
      
      showToast({
        title: "Черновик удален",
        description: "Черновик был успешно удален",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast({
        title: "Ошибка удаления",
        description: error instanceof Error ? error.message : "Не удалось удалить черновик",
        variant: "destructive"
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleEditPost = (postId: string) => {
    window.location.href = `/blog/edit/${postId}`;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl w-full mx-auto">
        <div className={`${!isMobile ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index} className="w-full min-w-[280px] overflow-hidden">
              <div className="p-4">
                <div className="h-48 w-full rounded-lg pb-2">
                  <Skeleton className="h-full w-full" />
                </div>
              </div>
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="p-4">
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="container max-w-4xl w-full">
        <Card className="w-full min-w-[280px] text-center p-8">
          <p className="mb-4 text-lg">
            {draftsOnly
              ? "У вас пока нет сохраненных черновиков"
              : publishedOnly
                ? "У вас пока нет опубликованных постов"
                : "Здесь пока нет опубликованных постов"}
          </p>
          {onlyMyPosts && (
            <Button onClick={() => window.location.href = "/blog/new"}>
              Create Post
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl w-full mx-auto">
      <div className={`${!isMobile && gridView ? 'grid grid-cols-2 gap-4' : 'space-y-6'}`}>
        {posts.map((post, index) => {
          // Приоритетная загрузка для первых изображений (above the fold)
          // В grid view - первые 4 изображения, в list view - первые 2
          const isPriority = gridView ? index < 4 : index < 2;
          
          return (
            <BlogPostCard
              key={post.id}
              post={post as BlogPost}
              gridView={gridView}
              isPriority={isPriority}
              isDraft={draftsOnly}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              isDeleting={deletingPostId === post.id}
            />
          );
        })}
      </div>
      
      {/* Пагинация - показывать только если постов больше 10 */}
      {totalCount > POSTS_PER_PAGE && (
        <div className="flex justify-center mt-8">
          <Pagination
            page={currentPage}
            pageSize={POSTS_PER_PAGE}
            total={totalCount}
            onUpdate={(page) => setCurrentPage(page)}
            compact={isMobile}
          />
        </div>
      )}
    </div>
  );
};

export default PostList;
