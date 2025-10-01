/**
 * Типы для работы с API блога
 * @module shared/api/blog
 */

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  published: boolean;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
};

export type BlogPostFilters = {
  publishedOnly?: boolean;
  draftsOnly?: boolean;
  onlyMyPosts?: boolean;
  authorId?: string;
  page?: number;
  pageSize?: number;
};

export type BlogPostsResponse = {
  posts: BlogPost[];
  totalCount: number;
  page: number;
  pageSize: number;
};

