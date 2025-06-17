"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text } from "@gravity-ui/uikit"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SearchComponent from "../components/SearchComponent"
import type { SearchResult } from "../components/SearchComponent"

export default function BlogPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("posts")
  const [searchActive, setSearchActive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session?.user)
    }
    
    checkAuth()
  }, [])

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`)
  }

  const handleSearchQueryChange = (query: string) => {
    setSearchActive(!!query.trim())
  }

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
        <div className="px-4">
          <SearchComponent
            title=""
            placeholder="Поиск по блогу..."
            readButtonText="Читать"
            onResultClick={handleSearchResultClick}
            onUpdate={handleSearchQueryChange}
          />
        </div>
        {!searchActive && <PostList />}
      </main>
    </div>
  );
}
