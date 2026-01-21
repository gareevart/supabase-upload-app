
import { useToast } from "@/hooks/use-toast";
import { EditorContent } from "@/app/components/blog/editor/types";
import { supabase } from "@/lib/supabase";

interface SavePostProps {
  title: string;
  slug: string;
  excerpt: string;
  content: EditorContent[];
  featuredImageUrl: string | null;
  initialPostId?: string;
  setIsLoading: (loading: boolean) => void;
  onSave?: () => void;
}

export function useSavePost() {
  const { toast } = useToast();

  const validatePost = (title: string, slug: string): string | null => {
    if (!title) {
      return "Укажите заголовок поста";
    }

    if (!slug) {
      return "URL поста не может быть пустым";
    }

    return null;
  };

  const savePost = async ({
    title,
    slug,
    excerpt,
    content,
    featuredImageUrl,
    initialPostId,
    setIsLoading,
    onSave
  }: SavePostProps, publish: boolean = false) => {
    const validationError = validatePost(title, slug);
    if (validationError) {
      toast({
        title: "Ошибка",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if slug is already used by another post
      if (!initialPostId || slug !== slug) {
        const { data: existingPost } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", slug)
          .single();
          
        if (existingPost && existingPost.id !== initialPostId) {
          toast({
            title: "Ошибка",
            description: "Этот URL уже используется. Пожалуйста, выберите другой.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Пользователь не авторизован");
      }

      const serializedContent = typeof content === "string" ? content : JSON.stringify(content);
      const postData = {
        title,
        content: serializedContent,
        excerpt: excerpt || null,
        slug,
        featured_image: featuredImageUrl,
        published: publish,
      };

      let result;
      
      const response = await fetch(
        initialPostId ? `/api/blog-posts/${initialPostId}` : "/api/blog-posts",
        {
          method: initialPostId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          credentials: "include",
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Не удалось сохранить пост");
      }

      result = await response.json();

      toast({
        title: publish ? "Пост опубликован" : "Черновик сохранен",
        description: "Ваш пост был успешно сохранен",
      });

      if (onSave) onSave();

    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Ошибка сохранения",
        description: error instanceof Error ? error.message : "Произошла ошибка при сохранении поста",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { savePost };
}
