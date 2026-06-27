"use client"

import "../blog.css"
import { supabase } from "@/lib/supabase"
import { Calendar, Person, Pencil, TrashBin } from "@gravity-ui/icons"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MarkdownRenderer } from "@/features/blog-editor/ui/MarkdownRenderer"
import { useState, useEffect } from "react"
import { Button, Icon, Text, Dialog } from "@gravity-ui/uikit"
import { Breadcrumbs as LegacyBreadcrumbs } from "@gravity-ui/uikit/legacy"
import { ActionBar } from "@gravity-ui/navigation"
import { useToast } from "@/hooks/use-toast"
import React from "react"
import { TableOfContents } from "@/shared/ui/TableOfContents"
import { useIsMobile } from "@/hooks/use-mobile"
import { useI18n } from "@/app/contexts/I18nContext"
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const { t, language } = useI18n()

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

    setShowDeleteConfirm(false);
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
        title: t('blogView.deleteSuccessTitle'),
        description: t('blogView.deleteSuccessText'),
        variant: "default"
      });

      router.push("/blog");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: t('blogView.deleteErrorTitle'),
        description: t('blogView.deleteErrorText'),
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ru' ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const canEditPost = userRole === 'admin' || userRole === 'editor';

  return (
    <React.Fragment>
      <div className="blog-post-actionbar">
        <div className="blog-post-container blog-post-content">
          <ActionBar aria-label={t('blogView.postActions')}>
            <ActionBar.Section style={{ columnGap: 20, gap: 20 }}>
              <ActionBar.Group stretchContainer style={{ minWidth: 0 }}>
                <ActionBar.Item style={{ minWidth: 0, width: '100%' }}>
                  <LegacyBreadcrumbs
                    className="blog-post-breadcrumbs"
                    lastDisplayedItemsCount={1}
                    firstDisplayedItemsCount={1}
                    items={[
                      {
                        text: t('blogView.breadcrumbBlog'),
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
                        {t('blogView.edit')}
                      </Button>
                    </Link>
                  </ActionBar.Item>
                  <ActionBar.Item>
                    <Button
                      view="outlined-danger"
                      onClick={() => setShowDeleteConfirm(true)}
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

      <div className="blog-post-container blog-post-container_padded">
        <div style={{
          display: 'flex',
          gap: '24px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start'
        }}>
          {/* Main content */}
          <div style={{ flex: '1', minWidth: 0, maxWidth: isMobile ? '100%' : 'calc(100% - 300px)' }}>
            <Text variant="display-2" className="blog-post-title">{post.title}</Text>

            <div className="blog-post-meta">
              <div className="blog-post-meta__item">
                <Icon data={Calendar} size={16} />
                <Text variant="body-2" color="secondary">
                  {post.created_at ? formatDate(post.created_at) : t('blogView.noDate')}
                </Text>
              </div>
              <div className="blog-post-meta__item">
                <Icon data={Person} size={16} />
                <Text variant="body-2" color="secondary">
                  {post.author?.name || post.author?.username || t('blogView.anonymous')}
                </Text>
              </div>
            </div>

            {/* ToC for mobile — shown above the content */}
            {isMobile && (
              <div className="blog-post-toc-mobile">
                <TableOfContents content={post.content} />
              </div>
            )}

            {post.featured_image && post.show_featured_image !== false && (
              <div className="blog-post-cover">
                <Image
                  src={post.featured_image}
                  alt={post.title}
                  fill
                  className="blog-post-cover__img"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}

            <div className="blog-post-content-body">
              <MarkdownRenderer content={post.content} />
            </div>
            <Subscribe />
          </div>

          {/* Table of Contents — desktop only, on the right */}
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

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="s"
      >
        <Dialog.Header caption={t('blogView.deleteTitle')} />
        <Dialog.Body>
          <Text variant="body-1">{t('blogView.deleteText')}</Text>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setShowDeleteConfirm(false)}
          onClickButtonApply={handleDelete}
          textButtonApply={t('blogView.deleteConfirm')}
          textButtonCancel={t('blogView.cancel')}
          propsButtonApply={{ view: 'outlined-danger' }}
        />
      </Dialog>
    </React.Fragment>
  );
}
