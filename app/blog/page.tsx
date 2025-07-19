"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text, Icon, SegmentedRadioGroup } from "@gravity-ui/uikit"
import { LayoutCellsLarge, ListUl } from '@gravity-ui/icons';
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SearchComponent from "../components/SearchComponent"
import type { SearchResult } from "../components/SearchComponent"
import { useIsMobile } from "@/hooks/use-mobile"

export default function BlogPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("posts")
  const [searchActive, setSearchActive] = useState(false)
  const [gridView, setGridView] = useState(true);
  const isMobile = useIsMobile()
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
        <div className="flex justify-between items-center mb-6">
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
          <div className="flex justify-between gap-4 items-top">
          <SearchComponent
            title=""
            placeholder="Поиск по блогу..."
            readButtonText="Читать"
            onResultClick={handleSearchResultClick}
            onUpdate={handleSearchQueryChange}
          /> 
          {!isMobile && (
            <SegmentedRadioGroup
              size="l"
              name="group1"
              defaultValue="grid"
              value={gridView ? 'grid' : 'list'}
              onUpdate={(value) => setGridView(value === 'grid')}>
              <SegmentedRadioGroup.Option value="list">
                <Icon data={ListUl} size={18} />
                </SegmentedRadioGroup.Option>
              <SegmentedRadioGroup.Option value="grid">
                <Icon data={LayoutCellsLarge} size={18} />
                </SegmentedRadioGroup.Option>
            </SegmentedRadioGroup>
          )}
        </div>

        {!searchActive && <PostList gridView={gridView} />}
      </main>
    </div>
  );
}
