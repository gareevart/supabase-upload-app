/**
 * API методы для работы с блогом
 * @module shared/api/blog
 */

import { supabase } from "@/lib/supabase";
import type { BlogPost, BlogPostFilters, BlogPostsResponse } from "./types";

/**
 * Получение списка постов с фильтрацией и пагинацией
 */
export async function fetchBlogPosts(
  filters: BlogPostFilters = {}
): Promise<BlogPostsResponse> {
  const {
    publishedOnly = false,
    draftsOnly = false,
    onlyMyPosts = false,
    authorId,
    page = 1,
    pageSize = 10,
  } = filters;

  try {
    // Получаем общее количество постов
    let countQuery = supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true });

    // Применяем фильтры для подсчета
    if (publishedOnly) {
      countQuery = countQuery.eq("published", true);
    } else if (draftsOnly) {
      countQuery = countQuery.eq("published", false);
    } else if (!draftsOnly && !publishedOnly) {
      countQuery = countQuery.eq("published", true);
    }

    if (onlyMyPosts && authorId) {
      countQuery = countQuery.eq("author_id", authorId);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Получаем посты с пагинацией
    let query = supabase
      .from("blog_posts")
      .select(
        `
        id,
        title,
        excerpt,
        slug,
        featured_image,
        created_at,
        author_id,
        published
      `
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Применяем те же фильтры
    if (publishedOnly) {
      query = query.eq("published", true);
    } else if (draftsOnly) {
      query = query.eq("published", false);
    } else if (!draftsOnly && !publishedOnly) {
      query = query.eq("published", true);
    }

    if (onlyMyPosts && authorId) {
      query = query.eq("author_id", authorId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Получаем информацию об авторах
    let postsWithAuthors: BlogPost[] = [];

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map((post) => post.author_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .in("id", authorIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Создаем карту профилей
      const profilesMap =
        profilesData?.reduce(
          (acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          },
          {} as Record<string, any>
        ) || {};

      // Добавляем информацию об авторах к постам
      postsWithAuthors = data.map((post) => ({
        ...post,
        author: profilesMap[post.author_id] || {
          name: null,
          username: null,
          avatar_url: null,
        },
      }));
    }

    return {
      posts: postsWithAuthors,
      totalCount: count || 0,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }
}

/**
 * Проверка наличия черновиков у пользователя
 */
export async function checkUserHasDrafts(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("author_id", userId)
      .eq("published", false)
      .limit(1);

    if (error) throw error;
    return !!(data && data.length > 0);
  } catch (error) {
    console.error("Error checking drafts:", error);
    return false;
  }
}

/**
 * Удаление поста
 */
export async function deleteBlogPost(postId: string): Promise<void> {
  const response = await fetch(`/api/blog-posts/${postId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Не удалось удалить пост");
  }
}

