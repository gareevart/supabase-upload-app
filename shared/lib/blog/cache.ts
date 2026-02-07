export const BLOG_POSTS_LIST_PREFIX = 'blog:posts:list:';
export const BLOG_POST_ID_PREFIX = 'blog:post:id:';
export const BLOG_POST_SLUG_PREFIX = 'blog:post:slug:';

type BlogPostsListKeyParams = {
  userId: string;
  onlyMine: boolean;
  publishedOnly: boolean;
  draftsOnly: boolean;
};

export const buildBlogPostsListKey = ({
  userId,
  onlyMine,
  publishedOnly,
  draftsOnly
}: BlogPostsListKeyParams) =>
  `${BLOG_POSTS_LIST_PREFIX}user:${userId}:onlyMine:${onlyMine ? 1 : 0}:publishedOnly:${
    publishedOnly ? 1 : 0
  }:draftsOnly:${draftsOnly ? 1 : 0}`;

export const buildBlogPostIdKey = (params: { id: string; userId: string }) =>
  `${BLOG_POST_ID_PREFIX}${params.id}:user:${params.userId}`;

export const buildBlogPostSlugKey = (slug: string) =>
  `${BLOG_POST_SLUG_PREFIX}${slug}`;
