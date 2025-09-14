"use client"

import PostEditor from "@/app/components/blog/PostEditor"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button, Skeleton, Card, Text } from "@gravity-ui/uikit"

export default function NewBlogPost() {
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
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
            <Skeleton  className="h-96 w-full bg-gray-100 animate-pulse"/>
        </Card>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
         <Text variant="display-1">Authentication Required</Text>
         <Text variant="body-1">You need to be logged in to create a blog post</Text>
            <Button
              size="l"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => router.push("/auth/profile")}
            >
              Log In
            </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <PostEditor />
    </div>
  )
}