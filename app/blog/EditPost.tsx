
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import PostEditor from "@/app/components/blog/PostEditor";
import { Button } from '@gravity-ui/uikit';
import { Container } from "@/app/components/ui/container";

type BlogPost = {
  id: string;
  author_id: string;
  slug: string;
  [key: string]: any; // Allow other properties
};

const EditPost = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    if (!id || !user) return;
    
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        
        // Проверяем, является ли текущий пользователь автором
        if (data.author_id !== user.id) {
          toast({
            title: "Доступ запрещен",
            description: "Вы не можете редактировать этот пост",
            variant: "destructive",
          });
          router.push("/");
          return;
        }
        
        // Ensure required fields are present and non-null
        if (!data.slug) {
          throw new Error("Post slug is required");
        }
        
        setPost(data as BlogPost);
      } catch (error) {
        console.error("Error fetching post:", error);
        toast({
          title: "Ошибка загрузки поста",
          description: "Не удалось загрузить пост",
          variant: "destructive",
        });
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPost();
  }, [id, user, toast, router]);
  
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    router.push("/auth");
    return null;
  }
  
  if (!post) {
    return (
      <div className="container mx-auto px-4 text-center py-12">
        <h2 className="text-2xl mb-4">Пост не найден</h2>
        <Button onClick={() => router.push("/")}>Вернуться на главную</Button>
      </div>
    );
  }
  
  return (
    <Container>
      <h1 className="text-3xl font-bold text-center mb-8">Редактирование поста</h1>
      <PostEditor initialPost={post} onSave={() => router.push(`/blog/${post.slug}`)} />
    </Container>
  );
};

export default EditPost;
