"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text, Icon, SegmentedRadioGroup, Select, Spin } from "@gravity-ui/uikit"
import { LayoutCellsLarge, ListUl } from '@gravity-ui/icons';
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SearchComponent from "../components/SearchComponent"
import type { SearchResult } from "../components/SearchComponent"
import { useIsMobile } from "@/hooks/use-mobile"

type PostFilter = 'all' | 'published' | 'drafts';

function BlogPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("posts")
  const [searchActive, setSearchActive] = useState(false)
  const [gridView, setGridView] = useState(true);
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [hasDrafts, setHasDrafts] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const isMobile = useIsMobile()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const authenticated = !!session?.user
      setIsAuthenticated(authenticated)
      
      if (authenticated && session?.user?.id) {
        setUserId(session.user.id)
        // Check if user has drafts
        const { data: drafts, error } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('author_id', session.user.id)
          .eq('published', false)
          .limit(1)
        
        if (!error && drafts && drafts.length > 0) {
          setHasDrafts(true)
        }
      }
    }
    
    checkAuth()
  }, [])

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`)
  }

  const handleSearchQueryChange = (query: string) => {
    setSearchActive(!!query.trim())
  }

  const filterOptions = [
    { value: 'all', content: 'Все статьи' },
    { value: 'published', content: 'Опубликованные' },
    { value: 'drafts', content: 'Черновики' }
  ];

  // Handle filter change with loading state
  const handleFilterChange = async (newFilter: PostFilter) => {
    setIsFilterLoading(true);
    setPostFilter(newFilter);
    // Small delay to show loading state
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 300);
  };

  // Determine props for PostList based on filter
  const getPostListProps = () => {
    const baseProps = {
      gridView,
      onlyMyPosts: false // На публичной странице блога показываем все посты
    };

    switch (postFilter) {
      case 'published':
        return { ...baseProps, publishedOnly: true, onlyMyPosts: isAuthenticated && userId ? true : false };
      case 'drafts':
        return { ...baseProps, draftsOnly: true, onlyMyPosts: true }; // Черновики только свои
      default:
        return { ...baseProps, publishedOnly: true }; // По умолчанию показываем все опубликованные посты
    }
  };

  return (
    <div className="min-h-screen pb-20 py-6">
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
        <div className="relative flex justify-between gap-4 items-top pb-4">
          <SearchComponent
            title=""
            placeholder="Поиск по блогу..."
            readButtonText="Читать"
            onResultClick={handleSearchResultClick}
            onUpdate={handleSearchQueryChange}
            className="flex-1"
          />
          <div className="flex gap-2 items-center">
            {isAuthenticated && hasDrafts && (
              <Select
                size="l"
                value={[postFilter]}
                onUpdate={(value) => handleFilterChange(value[0] as PostFilter)}
                options={filterOptions}
                width={160}
              />
            )}
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
        </div>

        {!searchActive && (
          <div className="relative">
            {isFilterLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <Spin size="l" />
              </div>
            )}
            <PostList {...getPostListProps()} key={`${postFilter}-${gridView}`} />
          </div>
        )}
      </main>
    </div>
  );
}

export default BlogPageContent;
