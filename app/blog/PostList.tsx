
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Card, Icon, Button, Skeleton, Text } from '@gravity-ui/uikit';
import { Calendar, Pencil, Person } from '@gravity-ui/icons';
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
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
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
          .order("created_at", { ascending: false });

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
  }, [onlyMyPosts, publishedOnly, draftsOnly, showToast]);

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
              <div className="p-2">
                <div className="h-48 w-full rounded-lg">
                  <Skeleton className="h-full w-full" />
                </div>
              </div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="container max-w-4xl w-full mx-auto p-4">
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
            <CardHeader>
              <CardTitle className="text-2xl">
                <Link href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`}>
                  <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">{post.title}</Text>
                </Link>
              </CardTitle>
              {post.excerpt && <CardDescription>{post.excerpt}</CardDescription>}
            </CardHeader>
            <CardFooter className="flex justify-between text-sm text-muted-foreground">
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
                <Button
                  view="outlined"
                  size="m"
                  className="flex items-center gap-1"
                  onClick={() => window.location.href = `/blog/edit/${post.id}`}
                >
                  <Icon data={Pencil} size={16} />
                  <span>Edit</span>
                </Button>
              ) : (
                <Button
                  view="normal"
                  size="m"
                  onClick={() => window.location.href = `/blog/${post.slug}`}
                >
                  Читать
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PostList;
