import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Skeleton, Pagination, Button, Text, Dialog } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/app/contexts/I18nContext";
import { useBlogPosts, useAuth } from "@/shared/lib/hooks/useBlogPosts";
import { deleteBlogPost } from "@/shared/api/blog";
import { BlogPostCard } from "@/shared/ui/BlogPostCard";
import type { BlogPost } from "@/shared/ui/BlogPostCard";
import "./PostList.css";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { t } = useI18n();
  const { userId } = useAuth();

  const POSTS_PER_PAGE = 10;

  // Use hook with caching through SWR
  const { posts, totalCount, isLoading, mutate } = useBlogPosts({
    publishedOnly,
    draftsOnly,
    onlyMyPosts,
    authorId: onlyMyPosts ? userId || undefined : undefined,
    page: currentPage,
    pageSize: POSTS_PER_PAGE,
  });

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const postId = confirmDeleteId;

    setConfirmDeleteId(null);
    setDeletingPostId(postId);

    try {
      await deleteBlogPost(postId);

      // Update cache after deletion
      mutate();

      showToast({
        title: t('blogPage.draftDeletedTitle'),
        description: t('blogPage.draftDeletedText'),
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast({
        title: t('blogPage.deleteErrorTitle'),
        description: error instanceof Error ? error.message : t('blogPage.deleteErrorText'),
        variant: "destructive"
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleEditPost = (postId: string) => {
    router.push(`/blog/edit/${postId}`);
  };

  if (isLoading) {
    return (
      <div className="post-list">
        <div className={!isMobile ? 'post-list__grid' : 'post-list__stack'}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card size="l" key={index} className="post-list__skeleton-card">
              <div className="post-list__skeleton-media">
                <div className="post-list__skeleton-image">
                  <Skeleton style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
              <div className="post-list__skeleton-body">
                <Skeleton style={{ height: 24, width: '75%' }} />
                <Skeleton style={{ height: 16, width: '50%' }} />
                <Skeleton style={{ height: 16, width: 96 }} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="post-list">
        <Card size="l" className="post-list__empty">
          <Text variant="body-2">
            {draftsOnly
              ? t('blogPage.emptyDrafts')
              : publishedOnly
                ? t('blogPage.emptyPublished')
                : t('blogPage.emptyAll')}
          </Text>
          {onlyMyPosts && (
            <Button view="action" size="l" onClick={() => router.push("/blog/new")}>
              {t('blogPage.createPostShort')}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="post-list">
      <div className={!isMobile && gridView ? 'post-list__grid' : 'post-list__stack'}>
        {posts.map((post, index) => {
          // Prioritize loading the first above-the-fold images.
          // Grid view: first 4 images; list view: first 2.
          const isPriority = gridView ? index < 4 : index < 2;

          return (
            <BlogPostCard
              key={post.id}
              post={post as BlogPost}
              gridView={gridView}
              isPriority={isPriority}
              isDraft={draftsOnly}
              onEdit={handleEditPost}
              onDelete={(postId) => setConfirmDeleteId(postId)}
              isDeleting={deletingPostId === post.id}
            />
          );
        })}
      </div>

      {/* Pagination — only shown when there are more posts than one page */}
      {totalCount > POSTS_PER_PAGE && (
        <div className="post-list__pagination">
          <Pagination
            page={currentPage}
            pageSize={POSTS_PER_PAGE}
            total={totalCount}
            onUpdate={(page) => setCurrentPage(page)}
            compact={isMobile}
          />
        </div>
      )}

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        size="s"
      >
        <Dialog.Header caption={t('blogPage.deleteDraftTitle')} />
        <Dialog.Body>
          <Text variant="body-1">{t('blogPage.deleteDraftText')}</Text>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setConfirmDeleteId(null)}
          onClickButtonApply={confirmDelete}
          textButtonApply={t('blogPage.deleteConfirm')}
          textButtonCancel={t('blogPage.cancel')}
          propsButtonApply={{ view: 'outlined-danger' }}
        />
      </Dialog>
    </div>
  );
};

export default PostList;
