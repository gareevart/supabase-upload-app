"use client"

import PostEditor from "@/app/components/blog/PostEditor"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button, Skeleton, Card, Text } from "@gravity-ui/uikit"
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
        <Card className="blog-editor-state__card">
          <Text variant="display-1">{t('blogEditor.authRequiredTitle')}</Text>
          <Text variant="body-1">{t('blogEditor.authRequiredText')}</Text>
          <Button
            size="l"
            view="action"
            onClick={() => router.push("/auth/profile")}
          >
            {t('blogEditor.logIn')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="blog-editor-page">
      <PostEditor onSave={() => {
        // Always redirect to the blog page after creating a new post
        router.push("/blog");
      }} />
    </div>
  )
}
