"use client"

import "../blog.css"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Calendar, Person, Pencil, TrashBin } from "@gravity-ui/icons"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MarkdownRenderer } from "@/features/blog-editor/ui/MarkdownRenderer"
import { useState, useEffect } from "react"
import { Button, Icon } from "@gravity-ui/uikit"
import { Breadcrumbs as LegacyBreadcrumbs } from "@gravity-ui/uikit/legacy"
import { ActionBar } from "@gravity-ui/navigation"
import { useToast } from "@/hooks/use-toast"
import React from "react"
import { TableOfContents } from "@/shared/ui/TableOfContents"
import { useIsMobile } from "@/hooks/use-mobile"
import Subscribe from "@/app/components/Subscribe/Subscribe"

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

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    // The post itself is server-rendered and passed as a prop; only the
    // per-user role check needs to run client-side (it cannot be cached).
    const fetchUserRole = async () => {
      try {
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
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  const handleDelete = async () => {
    if (!post) return;

    if (!confirm("Вы уверены, что хотите удалить этот пост?")) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete via the API route so the server can revalidate the cached
      // blog list and post pages (revalidatePath).
      const res = await fetch(`/api/blog-posts/${post.id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete blog post");
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

  const canEditPost = userRole === 'admin' || userRole === 'editor';

  return (
    <React.Fragment>
      <div className="blog-post-actionbar">
      <div className="container mx-auto md:px-6 blog-post-content" style={{ maxWidth: '1400px' }}>
          <ActionBar aria-label="Post actions">
            <ActionBar.Section style={{ columnGap: 20, gap: 20 }}>
              <ActionBar.Group stretchContainer style={{ minWidth: 0 }}>
                <ActionBar.Item style={{ minWidth: 0, width: '100%' }}>
                  <LegacyBreadcrumbs
                    className="blog-post-breadcrumbs"
                    lastDisplayedItemsCount={1}
                    firstDisplayedItemsCount={1}
                    items={[
                      {
                        text: "Blog",
                        action: () => router.push("/blog")
                      },
                      { text: post.title, href: post.slug ? `/blog/${post.slug}` : "/blog" }
                    ]}
                  />
                </ActionBar.Item>
              </ActionBar.Group>

              {canEditPost && (
                <ActionBar.Group pull="right">
                  <ActionBar.Item>
                    <Link href={`/blog/edit/${post.id}`} passHref>
                      <Button view="normal">
                        <Icon data={Pencil} size={16} />
                        Edit
                      </Button>
                    </Link>
                  </ActionBar.Item>
                  <ActionBar.Item>
                    <Button
                      view="outlined-danger"
                      onClick={handleDelete}
                      loading={isDeleting}
                      disabled={isDeleting}
                    >
                      <Icon data={TrashBin} size={16} />
                    </Button>
                  </ActionBar.Item>
                </ActionBar.Group>
              )}
            </ActionBar.Section>
          </ActionBar>
        </div>
      </div>

      <div className="container mx-auto p-4 md:px-6 py-8" style={{ maxWidth: '1400px' }}>
        <div style={{
        display: 'flex',
        gap: '24px',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'flex-start'
        }}>
          {/* Main content */}
          <div style={{ flex: '1', minWidth: 0, maxWidth: isMobile ? '100%' : 'calc(100% - 300px)' }}>
            <CardTitle className="text-3xl font-bold mb-4 blog-post-title">{post.title}</CardTitle>

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
              <div className="py-4">
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
              <MarkdownRenderer content={post.content} />
            </CardContent>
            <Subscribe />
          </div>

          {/* Table of Contents - только на десктопе справа */}
          {!isMobile && (
            <aside style={{
              width: '280px',
              position: 'sticky',
              top: '72px',
              alignSelf: 'flex-start'
            }}>
              <TableOfContents content={post.content} />
            </aside>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}