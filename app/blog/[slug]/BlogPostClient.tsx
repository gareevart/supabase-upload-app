"use client"

import "../blog.css"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { ArrowLeft, Calendar, Person, Pencil, TrashBin } from "@gravity-ui/icons"
import Image from "next/image"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import TipTapContent from "@/app/components/blog/TipTapContent"
import { useState, useEffect } from "react"
import { Button, Icon, Skeleton, Card as GravityCard } from "@gravity-ui/uikit"
import { useToast } from "@/hooks/use-toast"
import React from "react"
import { TableOfContents } from "@/shared/ui/TableOfContents"
import { useIsMobile } from "@/hooks/use-mobile"

interface BlogPost {
  id: string
  title: string
  content: string | { html?: string } | any
  excerpt: string | null
  slug: string | null
  featured_image: string | null
  show_featured_image: boolean | null
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

export default function BlogPostClient({ params }: { params: any }) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  // Use React.use to unwrap the params Promise
  const unwrappedParams = React.use(params as any) as { slug: string }
  const slug = unwrappedParams.slug

  useEffect(() => {
    const fetchPostAndUserRole = async () => {
      try {
        // Get the post via public API to include author with service role
        const res = await fetch(`/api/public/blog-posts/${slug}`);
        if (!res.ok) {
          router.push("/blog");
          return;
        }
        const postJson = await res.json();
        setPost(postJson);

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
      <div className="container mx-auto px-4 md:px-6" style={{ maxWidth: '1400px' }}>
        <div style={{
          display: 'flex',
          gap: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start'
        }}>
          {/* Основной контент - скелетон */}
          <div style={{ flex: '1', minWidth: 0, maxWidth: isMobile ? '100%' : 'calc(100% - 300px)' }}>
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-6" />
            <Skeleton className="h-[300px] rounded mb-6" />
            <div className="space-y-3">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* ToC скелетон - только на десктопе справа */}
          {!isMobile && (
            <aside style={{
              width: '280px',
              position: 'sticky',
              top: '24px',
              alignSelf: 'flex-start'
            }}>
              <GravityCard size="l">
                <div style={{ padding: '16px' }}>
                  <Skeleton style={{ height: '24px', width: '128px', marginBottom: '16px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton style={{ height: '16px', width: '100%' }} />
                    <div style={{ paddingLeft: '16px' }}>
                      <Skeleton style={{ height: '16px', width: '100%' }} />
                    </div>
                    <div style={{ paddingLeft: '16px' }}>
                      <Skeleton style={{ height: '16px', width: '100%' }} />
                    </div>
                    <Skeleton style={{ height: '16px', width: '100%' }} />
                    <div style={{ paddingLeft: '16px' }}>
                      <Skeleton style={{ height: '16px', width: '100%' }} />
                    </div>
                    <Skeleton style={{ height: '16px', width: '100%' }} />
                  </div>
                </div>
              </GravityCard>
            </aside>
          )}
        </div>
      </div>
    );
  }

  if (!post) {
    return notFound();
  }

  const canEditPost = userRole === 'admin' || userRole === 'editor';

  return (
    <div className="container mx-auto px-4 md:px-6" style={{ maxWidth: '1400px' }}>
      <div style={{
        display: 'flex',
        gap: '24px',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'flex-start'
      }}>
        {/* Основной контент */}
        <div style={{ flex: '1', minWidth: 0, maxWidth: isMobile ? '100%' : 'calc(100% - 300px)' }}>
          <div className="flex justify-between items-start mb-4">
            <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>

            {canEditPost && (
              <div className="flex gap-2">
                <Link href={`/blog/edit/${post.id}`} passHref>
                  <Button view="normal">
                    <Icon data={Pencil} size={16} />
                    Edit
                  </Button>
                </Link>
                <Button
                  view="outlined-danger"
                  onClick={handleDelete}
                  loading={isDeleting}
                  disabled={isDeleting}
                >
                  <Icon data={TrashBin} size={16} />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{post.created_at ? formatDate(post.created_at) : 'Дата не указана'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Person className="w-4 h-4" />
              <span>{post.author?.name || post.author?.username || "Anonymous"}</span>
            </div>
          </div>

          {/* ToC для мобильных устройств - показывать над контентом */}
          {isMobile && (
            <div style={{ marginBottom: '16px' }}>
              <TableOfContents content={post.content} />
            </div>
          )}

          {post.featured_image && post.show_featured_image !== false && (
            <div className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden relative">
              <Image
                src={post.featured_image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <CardContent className="prose prose-lg max-w-none">
            {/* Use TipTapContent to render content regardless of format */}
            <TipTapContent content={post.content} />
          </CardContent>
        </div>

        {/* Table of Contents - только на десктопе справа */}
        {!isMobile && (
          <aside style={{
            width: '280px',
            position: 'sticky',
            top: '24px',
            alignSelf: 'flex-start'
          }}>
            <TableOfContents content={post.content} />
          </aside>
        )}
      </div>
    </div>
  );
}