
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, Icon, Button, Skeleton, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Calendar, Pencil, Person, LayoutCellsLarge, ListUl } from '@gravity-ui/icons';

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
}

export const PostList = ({
  onlyMyPosts = false,
  publishedOnly = false,
  draftsOnly = false
}: PostListProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gridView, setGridView] = useState(true); // Default to grid view
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Mobile devices should default to list view
    if (isMobile) {
      setGridView(false);
    }
  }, [isMobile]);

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
      <div className="container max-w-4xl w-full mx-auto p-4">
        <div className={`${!isMobile ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="w-full min-w-[280px] overflow-hidden">
              <div className="h-48 w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
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
              Create New Post
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl w-full mx-auto p-4">
      {/* Hide view toggle on mobile */}
      {!isMobile && (
        <div className="flex justify-end mb-4">
          <SegmentedRadioGroup
            size="l"
            name="group1"
            defaultValue="grid"
            value={gridView ? 'grid' : 'list'}
            onUpdate={(value) => setGridView(value === 'grid')}>
            <SegmentedRadioGroup.Option value="list">
              <Icon data={ListUl} size={18} />
              Список</SegmentedRadioGroup.Option>
            <SegmentedRadioGroup.Option value="grid">
              <Icon data={LayoutCellsLarge} size={18} />
              Сетка</SegmentedRadioGroup.Option>
          </SegmentedRadioGroup>
        </div>
      )}

      <div className={`${!isMobile && gridView ? 'grid grid-cols-2 gap-4' : 'space-y-6'}`}>
        {posts.map((post) => (
          <Card key={post.id} className="w-full min-w-[280px] overflow-hidden">
            {post.featured_image ? (
              <div className="h-48 w-full overflow-hidden">
                <Link href={`/blog/${post.slug}`}>
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full object-cover h-full transition-transform hover:scale-105"
                  />
                </Link>
              </div>
            ) : (
              <div className="h-48 w-full bg-gray-100"></div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">
                <Link href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`} className="hover:text-blue-600 transition-colors">
                  {post.title}
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
