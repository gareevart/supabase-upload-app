/**
 * Хук для работы с постами блога с кэшированием через React Query
 * @module shared/lib/hooks
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchBlogPosts, checkUserHasDrafts } from "@/shared/api/blog";
import type { BlogPostFilters, BlogPostsResponse } from "@/shared/api/blog";
import { useEffect, useState } from "react";

/**
 * Генерация ключа для кэша React Query
 */
function generateCacheKey(filters: BlogPostFilters): string {
  const { publishedOnly, draftsOnly, onlyMyPosts, authorId, page, pageSize } =
    filters;
  return JSON.stringify({
    publishedOnly,
    draftsOnly,
    onlyMyPosts,
    authorId,
    page,
    pageSize,
  });
}

/**
 * Хук для получения постов блога с автоматическим кэшированием
 */
export function useBlogPosts(filters: BlogPostFilters = {}) {
  const queryKey = ["blog-posts", generateCacheKey(filters)];

  const { data, error, isLoading, refetch: mutate } = useQuery<BlogPostsResponse>({
    queryKey,
    queryFn: () => fetchBlogPosts(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: 1000,
  });

  return {
    posts: data?.posts || [],
    totalCount: data?.totalCount || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 10,
    isLoading,
    error,
    mutate, // Для ручной ревалидации кэша
  };
}

/**
 * Хук для проверки наличия черновиков у пользователя
 */
export function useUserDrafts() {
  const [hasDrafts, setHasDrafts] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDrafts = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          setUserId(session.user.id);
          const draftsExist = await checkUserHasDrafts(session.user.id);
          setHasDrafts(draftsExist);
        }
      } catch (error) {
        console.error("Error checking drafts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkDrafts();
  }, []);

  return { hasDrafts, userId, isLoading };
}

/**
 * Хук для получения информации о текущем пользователе
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authenticated = !!session?.user;
        setIsAuthenticated(authenticated);

        if (authenticated && session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, userId, isLoading };
}

