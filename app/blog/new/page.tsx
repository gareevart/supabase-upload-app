"use client"

import PostEditor from "@/app/components/blog/PostEditor"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Skeleton, Card, PlaceholderContainer } from "@gravity-ui/uikit"
import { useI18n } from "@/app/contexts/I18nContext"
import "@/app/components/blog/BlogEditor.css"

export default function NewBlogPost() {
  const { t } = useI18n()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="blog-editor-state">
        <Card>
          <Skeleton style={{ height: 384, width: '100%' }} />
        </Card>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="blog-editor-state">
        <PlaceholderContainer
          className="blog-editor-state__card"
          size="l"
          direction="column"
          title={t('blogEditor.authRequiredTitle')}
          description={t('blogEditor.authRequiredText')}
          image={{ src: '/file.svg', alt: '' }}
          actions={[{
            text: t('blogEditor.logIn'),
            view: 'action',
            size: 'l',
            onClick: () => router.push("/auth/profile"),
          }]}
        />
      </div>
    )
  }

  return (
    <div className="blog-editor-page">
      <PostEditor onSave={(published, savedPost) => {
        if (published && savedPost?.slug) {
          router.push(`/blog/${savedPost.slug}`);
        } else {
          router.push("/blog");
        }
      }} />
    </div>
  )
}
