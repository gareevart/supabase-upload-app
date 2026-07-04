"use client"

import { useState, useEffect } from "react"
import PostList from "./PostList"
import { Button, Text, Icon, SegmentedRadioGroup, Select } from "@gravity-ui/uikit"
import { LayoutCellsLarge, ListUl } from '@gravity-ui/icons';
import { useRouter, useSearchParams } from "next/navigation"
import SearchComponent from "../components/SearchComponent"
import type { SearchResult } from "../components/SearchComponent"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth, useUserDrafts } from "@/shared/lib/hooks/useBlogPosts"
import { useI18n } from "@/app/contexts/I18nContext"
import "./BlogPage.css"

type PostFilter = 'all' | 'published' | 'drafts';

function BlogPageContent() {
  const { t } = useI18n()
  const [searchActive, setSearchActive] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [controlsHidden, setControlsHidden] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get filter and view from URL parameters
  const filterParam = searchParams?.get('filter') as PostFilter | null
  const viewParam = searchParams?.get('view')

  const [gridView, setGridView] = useState(viewParam !== 'list');
  const [postFilter, setPostFilter] = useState<PostFilter>(filterParam || 'all');
  const isMobile = useIsMobile()

  // Synchronize state with URL parameters
  useEffect(() => {
    if (filterParam && ['all', 'published', 'drafts'].includes(filterParam)) {
      setPostFilter(filterParam)
    }
    if (viewParam) {
      setGridView(viewParam !== 'list')
    }
  }, [filterParam, viewParam])

  // Use hooks with caching
  const { isAuthenticated } = useAuth()
  const { hasDrafts, userId } = useUserDrafts()

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`)
  }

  const handleSearchQueryChange = (query: string) => {
    const hasContent = !!query.trim()
    setSearchActive(hasContent)

    // If there is content, keep controls hidden
    // If there is no content and no focus, show controls
    if (!hasContent && !searchFocused) {
      setControlsHidden(false)
    } else if (hasContent) {
      setControlsHidden(true)
    }
  }

  const handleSearchFocus = (focused: boolean) => {
    if (focused) {
      // Hide controls first
      setControlsHidden(true)
      // Then, after the hide animation (300ms), expand the field
      setTimeout(() => {
        setSearchFocused(true)
      }, 300)
    } else {
      // On blur, shrink the field first
      setSearchFocused(false)
      // Then show controls only if the search has no text
      setTimeout(() => {
        if (!searchActive) {
          setControlsHidden(false)
        }
      }, 300)
    }
  }

  // Update URL parameters
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
    { value: 'all', content: t('blogPage.filterAll') },
    { value: 'published', content: t('blogPage.filterPublished') },
    { value: 'drafts', content: t('blogPage.filterDrafts') }
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
      onlyMyPosts: false // On the public blog page, show all posts
    };

    switch (postFilter) {
      case 'published':
        return { ...baseProps, publishedOnly: true, onlyMyPosts: isAuthenticated && userId ? true : false };
      case 'drafts':
        return { ...baseProps, draftsOnly: true, onlyMyPosts: true }; // Drafts only own
      default:
        return { ...baseProps, publishedOnly: true }; // By default, show all published posts
    }
  };

  const toolbarCollapsed = controlsHidden || ((!isAuthenticated || !hasDrafts) && isMobile);

  return (
    <div className="blog-page">
      <main className="blog-page__main">
        <div className="blog-page__header">
          <Text variant="display-1">{t('blogPage.title')}</Text>
          {isAuthenticated && (
            <Button
              view="action"
              size="l"
              onClick={() => router.push("/blog/new")}
            >
              {t('blogPage.createPost')}
            </Button>
          )}
        </div>
        <div className={`blog-page__toolbar ${toolbarCollapsed ? 'blog-page__toolbar_collapsed' : ''}`}>
          <SearchComponent
            title=""
            placeholder={t('blogPage.searchPlaceholder')}
            readButtonText={t('blogPage.readButton')}
            onResultClick={handleSearchResultClick}
            onUpdate={handleSearchQueryChange}
            onFocusChange={handleSearchFocus}
            className="blog-page__search"
            expandOnFocus={true}
          />
          <div
            className="blog-page__controls"
            style={{
              opacity: controlsHidden ? 0 : 1,
              pointerEvents: controlsHidden ? 'none' : 'auto',
              transform: controlsHidden ? 'translateX(20px)' : 'translateX(0)',
              width: controlsHidden ? 0 : 'auto',
              overflow: 'hidden',
            }}
          >
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
                name="view"
                defaultValue="grid"
                value={gridView ? 'grid' : 'list'}
                onUpdate={(value) => handleViewChange(value === 'grid')}>
                <SegmentedRadioGroup.Option value="list" title={t('blogPage.viewList')}>
                  <Icon data={ListUl} size={18} />
                </SegmentedRadioGroup.Option>
                <SegmentedRadioGroup.Option value="grid" title={t('blogPage.viewGrid')}>
                  <Icon data={LayoutCellsLarge} size={18} />
                </SegmentedRadioGroup.Option>
              </SegmentedRadioGroup>
            )}
          </div>
        </div>

        {!searchActive && (
          <div className="blog-page__list">
            <PostList {...getPostListProps()} key={`${postFilter}-${gridView}`} />
          </div>
        )}
      </main>
    </div>
  );
}

export default BlogPageContent;
