"use client"

import { useParams } from "next/navigation"
import PostEditor from "@/app/components/blog/PostEditor"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, Skeleton, Text, Button } from "@gravity-ui/uikit"
import { useI18n } from "@/app/contexts/I18nContext"
import "@/app/components/blog/BlogEditor.css"

export default function EditBlogPost() {
  const params = useParams<{ id: string }>()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [post, setPost] = useState<any>(null);
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const postId = params?.id // Use optional chaining to avoid errors

  useEffect(() => {
    const checkAuthorizationAndFetchPost = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setIsAuthorized(false)
          return
        }

        // Fetch the post data
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("id", postId)
          .single()

        if (error) {
          throw error
        }

        // Get user's profile to check role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        // Check if user is author, admin, or editor
        const isAuthor = data.author_id === session.user.id
        const isAdminOrEditor = profile?.role === 'admin' || profile?.role === 'editor'

        setIsAuthorized(isAuthor || isAdminOrEditor)
        setPost(data);
      } catch (error) {
        console.error("Error checking authorization or fetching post:", JSON.stringify(error, null, 2))
        setIsAuthorized(false)
        toast({
          title: t('blogEditor.fetchErrorTitle'),
          description: t('blogEditor.fetchErrorText'),
          variant: "destructive"
        })
      }
    }

    if (postId) {
      checkAuthorizationAndFetchPost()
    }
  }, [postId, toast, t])

  if (isAuthorized === null || post === null) {
    return (
      <div className="blog-editor-state">
        <Skeleton style={{ height: 384, width: '100%' }} />
      </div>
    )
  }

  if (isAuthorized === false) {
    return (
      <div className="blog-editor-state">
        <Card className="blog-editor-state__card">
          <Text variant="header-2">{t('blogEditor.unauthorizedTitle')}</Text>
          <Text variant="body-1">{t('blogEditor.unauthorizedText')}</Text>
          <Button
            size="l"
            view="action"
            onClick={() => router.push("/blog")}
          >
            {t('blogEditor.backToBlog')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="blog-editor-page">
      <PostEditor initialPost={post} onSave={(published, savedPost) => {
        if (published) {
          // Published posts redirect to the post page
          router.push(`/blog/${savedPost.slug}`);
        } else {
          // Drafts redirect to the blog list
          router.push("/blog");
        }
      }} />
    </div>
  )
}
