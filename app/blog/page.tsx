"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text, Icon, SegmentedRadioGroup, Select, Loader } from "@gravity-ui/uikit"
import { LayoutCellsLarge, ListUl } from '@gravity-ui/icons';
import { useRouter, useSearchParams } from "next/navigation"
import SearchComponent from "../components/SearchComponent"
import type { SearchResult } from "../components/SearchComponent"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth, useUserDrafts } from "@/shared/lib/hooks/useBlogPosts"

type PostFilter = 'all' | 'published' | 'drafts';

function BlogPageContent() {
  const [activeTab, setActiveTab] = useState<string>("posts")
  const [searchActive, setSearchActive] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Получаем фильтр и вид из URL параметров
  const filterParam = searchParams.get('filter') as PostFilter | null
  const viewParam = searchParams.get('view')
  
  const [gridView, setGridView] = useState(viewParam !== 'list');
  const [postFilter, setPostFilter] = useState<PostFilter>(filterParam || 'all');
  const isMobile = useIsMobile()
  
  // Синхронизируем состояние с URL параметрами
  useEffect(() => {
    if (filterParam && ['all', 'published', 'drafts'].includes(filterParam)) {
      setPostFilter(filterParam)
    }
    if (viewParam) {
      setGridView(viewParam !== 'list')
    }
  }, [filterParam, viewParam])

  // Используем хуки с кэшированием
  const { isAuthenticated } = useAuth()
  const { hasDrafts, userId } = useUserDrafts()

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`)
  }

  const handleSearchQueryChange = (query: string) => {
    setSearchActive(!!query.trim())
  }

  // Функция для обновления URL параметров
  const updateURLParams = (filter: PostFilter, view: boolean) => {
    const params = new URLSearchParams()
    if (filter !== 'all') {
      params.set('filter', filter)
    }
    if (!view) {
      params.set('view', 'list')
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `/blog?${queryString}` : '/blog'
    router.push(newUrl, { scroll: false })
  }

  const filterOptions = [
    { value: 'all', content: 'Все статьи' },
    { value: 'published', content: 'Опубликованные' },
    { value: 'drafts', content: 'Черновики' }
  ];

  // Handle filter change
  const handleFilterChange = (newFilter: PostFilter) => {
    setPostFilter(newFilter);
    updateURLParams(newFilter, gridView);
  };

  // Handle view change
  const handleViewChange = (newGridView: boolean) => {
    setGridView(newGridView);
    updateURLParams(postFilter, newGridView);
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
    <div className="min-h-screen pt-4 pb-20">
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
            readButtonText="Read"
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
                onUpdate={(value) => handleViewChange(value === 'grid')}>
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
          <PostList {...getPostListProps()} key={`${postFilter}-${gridView}`} />
        )}
      </main>
    </div>
  );
}

export default BlogPageContent;
