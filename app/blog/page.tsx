"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text } from "@gravity-ui/uikit"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function BlogPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session?.user)
    }
    
    checkAuth()
  }, [])

  return (
    <div className="min-h-screen pb-20">
      <main className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6 px-4">
          <Text variant="display-1">Blog</Text>
          {isAuthenticated && (
            <Button
              view="action"
              size="l"
              onClick={() => router.push("/blog/new")}
            >
              Create New Post
            </Button>
          )}
        </div>
        <PostList />
      </main>
    </div>
  );
}
