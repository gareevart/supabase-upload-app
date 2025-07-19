"use client"

import "../blog.css"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { ArrowLeft, Calendar, Person, Pencil, TrashBin } from "@gravity-ui/icons"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import TipTapContent from "@/app/components/blog/TipTapContent"
import { useState, useEffect } from "react"
import { Button, Icon, Skeleton } from "@gravity-ui/uikit"
import { useToast } from "@/hooks/use-toast"
import React from "react"

interface BlogPost {
  id: string
  title: string
  content: string | { html?: string } | any
  excerpt: string | null
  slug: string | null
  featured_image: string | null
  created_at: string | null
  updated_at: string | null
  published: boolean | null
  author_id: string
  author: {
    name: string | null
    username: string | null
    avatar_url: string | null
  }
}

export default function BlogPostPage({ params }: { params: any }) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  // Use React.use to unwrap the params Promise
  const unwrappedParams = React.use(params as any) as { slug: string }
  const slug = unwrappedParams.slug

  useEffect(() => {
    const fetchPostAndUserRole = async () => {
      try {
        // Get the post
        const { data, error } = await supabase
          .from("blog_posts")
          .select(`
            id,
            title,
            content,
            excerpt,
            slug,
            featured_image,
            created_at,
            updated_at,
            published,
            author_id
          `)
          .eq("slug", slug)
          .eq("published", true)
          .single();

        if (error || !data) {
          router.push("/blog");
          return;
        }

        // Get the author information
        const { data: authorData } = await supabase
          .from("profiles")
          .select("id, name, username, avatar_url")
          .eq("id", data.author_id)
          .single();

        const postWithAuthor = {
          ...data,
          author: authorData || {
            name: null,
            username: null,
            avatar_url: null
          }
        };

        setPost(postWithAuthor);

        // Check user role
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          
          setUserRole(profile?.role || null);
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostAndUserRole();
  }, [slug, router]);

  const handleDelete = async () => {
    if (!post) return;
    
    if (!confirm("Вы уверены, что хотите удалить этот пост?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", post.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Успех",
        description: "Пост успешно удален",
        variant: "default"
      });
      
      router.push("/blog");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пост",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
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
      <div className="container max-w-4xl mx-auto mt-6">
        <div>
          <Skeleton className="h-10 w-3/4 mb-4"/>
          <Skeleton className="h-4 mb-6"/>
          <Skeleton className="h-[300px] rounded mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-4"/>
            <Skeleton className="h-4"/>
            <Skeleton className="h-4 mb-6"/>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return notFound();
  }

  const canEditPost = userRole === 'admin' || userRole === 'editor';

  return (
    <div className="container max-w-4xl mx-auto mt-6">
      <div className="flex justify-between items-start mb-4">
        <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
        
        {canEditPost && (
          <div className="flex gap-2">
            <Link href={`/blog/edit/${post.id}`} passHref>
              <Button view="normal" size="m">
                 <Icon data={Pencil} size={16} />
                Edit
              </Button>
            </Link>
            <Button 
              view="outlined-danger" 
              size="m" 
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
            >
              <Icon data={TrashBin} size={16} />
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-4 mb-4 mb-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{post.created_at ? formatDate(post.created_at) : 'Дата не указана'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Person className="w-4 h-4" />
          <span>{post.author?.name || post.author?.username || "Anonymous"}</span>
        </div>
      </div>

      {post.featured_image && (
        <div className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden ">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardContent className="prose prose-lg max-w-none">
        {/* Use TipTapContent to render content regardless of format */}
        <TipTapContent content={post.content} />
      </CardContent>
    </div>
  );
}
