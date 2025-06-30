"use client"

import { useParams } from "next/navigation"
import PostEditor from "@/app/components/blog/PostEditor"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@gravity-ui/uikit"
import { isTipTapContent } from "@/lib/tiptapConverter"

export default function EditBlogPost() {
  const params = useParams<{ id: string }>()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [post, setPost] = useState<any>(null);
  const router = useRouter()
  const { toast } = useToast()
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
          title: "Error",
          description: "Failed to verify authorization or fetch post",
          variant: "destructive"
        })
      }
    }

    if (postId) {
      checkAuthorizationAndFetchPost()
    }
  }, [postId, toast])

  if (isAuthorized === null || post === null) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
             <Skeleton  className="h-96 w-full"/>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isAuthorized === false) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are not authorized to edit this blog post.</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => router.push("/blog")}
            >
              Back to Blog
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <PostEditor initialPost={post} onSave={() => router.push(`/blog/${post.slug}`)} />
    </div>
  )
}