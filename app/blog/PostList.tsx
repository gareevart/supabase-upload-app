
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Icon, Button, Skeleton, Text, Pagination } from '@gravity-ui/uikit';
import { Calendar, Pencil, Person, TrashBin } from '@gravity-ui/icons';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";

type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
};

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();

  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // First, get the total count
        let countQuery = supabase
          .from("blog_posts")
          .select("*", { count: 'exact', head: true });

        // Apply the same filters for count
        if (publishedOnly) {
          countQuery = countQuery.eq("published", true);
        } else if (draftsOnly) {
          countQuery = countQuery.eq("published", false);
        } else if (!draftsOnly && !publishedOnly) {
          countQuery = countQuery.eq("published", true);
        }

        if (onlyMyPosts) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            countQuery = countQuery.eq("author_id", session.user.id);
          }
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        
        setTotalPosts(count || 0);

        // Then get the paginated data
        let query = supabase
          .from("blog_posts")
          .select(`
            id,
            title,
            excerpt,
            slug,
            featured_image,
            created_at,
            author_id
          `)
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE - 1);

        // Apply filters for published/drafts
        if (publishedOnly) {
          query = query.eq("published", true);
        } else if (draftsOnly) {
          query = query.eq("published", false);
        } else if (!draftsOnly && !publishedOnly) {
          // For public page - only published posts
          query = query.eq("published", true);
        }

        if (onlyMyPosts) {
          // Get only current user's posts
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            query = query.eq("author_id", session.user.id);
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch author information for all posts
        if (data && data.length > 0) {
          const authorIds = [...new Set(data.map(post => post.author_id))];
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, username, avatar_url")
            .in("id", authorIds);

          if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
          }

          // Map profiles to posts
          const profilesMap = (profilesData || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);

          // Transform posts with author information
          const transformedPosts = data.map(post => ({
            ...post,
            author: profilesMap[post.author_id] || {
              name: null,
              username: null,
              avatar_url: null
            }
          }));

          setPosts(transformedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        showToast({
          title: "Ошибка загрузки постов",
          description: "Не удалось загрузить посты",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [onlyMyPosts, publishedOnly, draftsOnly, showToast, currentPage]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот черновик? Это действие нельзя отменить.")) {
      return;
    }

    setDeletingPostId(postId);
    
    try {
      const response = await fetch(`/api/blog-posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось удалить пост');
      }

      // Удаляем пост из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      setTotalPosts(prev => prev - 1);
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
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
        {posts.map((post) => (
          <Card size="l" key={post.id} className="w-full min-w-[280px] overflow-hidden">
            <div className="p-2">
              {post.featured_image ? (
                <div className="h-48 w-full overflow-hidden rounded-lg">
                  <Link href={`/blog/${post.slug}`} style={{ position: 'relative', display: 'block', height: '100%', width: '100%' }}>
                    <Image
                      src={post.featured_image}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-all duration-300 hover:scale-105"
                      priority={false}
                      loading="lazy"
                    />
                  </Link>
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-100 rounded-lg"></div>
              )}
            </div>
            
              <div className="p-4">
                <div className="mb-2">
                <Link href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`}>
                  <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">{post.title}</Text>
                </Link>
                  {post.excerpt}
                </div>

              
            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                   <Icon data={Calendar} size={16} />
                  {post.created_at ? formatDate(post.created_at) : 'Without date'}
                </div>
                <div className="flex items-center">
                    <Icon data={Person} size={16} />
                  {post.author?.name || post.author?.username || "Anon"}
                </div>
              </div>
              {draftsOnly ? (
                <div className="flex items-center gap-2">
                  <Button
                    view="outlined"
                    size="m"
                    className="flex items-center gap-1"
                    onClick={() => window.location.href = `/blog/edit/${post.id}`}
                  >
                    <Icon data={Pencil} size={16} />
                    <span>Edit</span>
                  </Button>
                  <Button
                    view="outlined-danger"
                    size="m"
                    onClick={() => handleDeletePost(post.id)}
                    loading={deletingPostId === post.id}
                    disabled={deletingPostId === post.id}
                    title="Удалить черновик"
                  >
                    <Icon data={TrashBin} size={16} />
                  </Button>
                </div>
              ) : (
                <Button
                  view="normal"
                  size="m"
                  onClick={() => window.location.href = `/blog/${post.slug}`}
                >
                  Читать
                </Button>
              )}
            </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Пагинация - показывать только если постов больше 10 */}
      {totalPosts > POSTS_PER_PAGE && (
        <div className="flex justify-center mt-8">
          <Pagination
            page={currentPage}
            pageSize={POSTS_PER_PAGE}
            total={totalPosts}
            onUpdate={(page) => setCurrentPage(page)}
            compact={isMobile}
          />
        </div>
      )}
    </div>
  );
};

export default PostList;
