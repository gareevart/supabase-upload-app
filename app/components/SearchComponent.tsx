"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { Text, TextInput, Card, Skeleton, Icon, PlaceholderContainer } from '@gravity-ui/uikit';
import { Magnifier } from '@gravity-ui/icons';
import { BlogPostCard } from '@/shared/ui/BlogPostCard';
import { useIsMobile } from '@/hooks/use-mobile';
import './components.css';

export type SearchResult = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  searchContext?: {
    context: string;
    highlightedContext: string;
  } | null;
};

export interface SearchComponentProps {
  title?: string;
  placeholder?: string;
  noResultsText?: string;
  noResultsSubText?: string;
  startSearchText?: string;
  startSearchSubText?: string;
  readButtonText?: string;
  className?: string;
  onResultClick?: (result: SearchResult) => void;
  onUpdate?: (query: string) => void;
  onFocusChange?: (focused: boolean) => void;
  expandOnFocus?: boolean;
  gridView?: boolean;
}

export default function SearchComponent({
  title = "Поиск",
  placeholder = "Введите запрос для поиска...",
  noResultsText = "Ничего не найдено",
  noResultsSubText = "Попробуйте изменить поисковый запрос",
  startSearchText = "Начните поиск",
  startSearchSubText = "Введите ключевые слова для поиска по заголовкам, описаниям и содержимому постов",
  readButtonText = "Читать",
  className = "",
  onResultClick,
  onUpdate,
  onFocusChange,
  expandOnFocus = false,
  gridView = false
}: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = useIsMobile();

  const controllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string, signal: AbortSignal) => {
    if (signal.aborted || !query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      // Search runs entirely server-side; only matched results cross the wire.
      const res = await fetch(
        `/api/blog-posts/search?q=${encodeURIComponent(query)}`,
        { signal },
      );
      if (signal.aborted) return;
      if (!res.ok) throw new Error('Search request failed');
      const json = await res.json();
      if (signal.aborted) return;
      setSearchResults(json.results || []);
    } catch (error) {
      if (signal.aborted) return;
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      void performSearch(searchQuery, controller.signal);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [searchQuery, performSearch]);

  const handleResultClick = (post: SearchResult) => {
    if (onResultClick) {
      onResultClick(post);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocusChange) {
      onFocusChange(true);
    }
  };

  const handleBlur = () => {
    // Небольшая задержка перед сбросом фокуса, чтобы пользователь мог кликнуть на результаты
    setTimeout(() => {
      setIsFocused(false);
      if (onFocusChange) {
        onFocusChange(false);
      }
    }, 200);
  };

  return (
    <div
      className={`search-container ${className} ${expandOnFocus && isFocused ? 'expanded' : ''}`.trim()}
    >
      <TextInput
        size="l"
        hasClear={true}
        placeholder={placeholder}
        value={searchQuery}
        onUpdate={(value) => {
          if (value !== searchQuery) {
            controllerRef.current?.abort();
          }
          setSearchQuery(value);
          // Если поле очищается, сразу сбрасываем состояние поиска
          if (!value.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            setIsLoading(false);
          }
          if (onUpdate) {
            onUpdate(value);
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        startContent={<Icon data={Magnifier} size={20} className='search-left-icon' />}
      />

      {(isLoading || hasSearched) && (
        <div className={`search-results-container ${isMobile ? 'search-results-container--mobile' : ''}`}>
          {isLoading && (
            <div className="search-skeleton-list">
              {[1, 2, 3].map((index) => (
                <Card key={index} className="search-skeleton-card" size="l">
                  <div className="search-skeleton-image-wrapper">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <div className="search-skeleton-content">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="search-skeleton-footer">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && searchResults.length === 0 && (
            <PlaceholderContainer
              className="search-no-results-card"
              size="l"
              direction="column"
              title={noResultsText}
              description={noResultsSubText}
              image={{ src: '/file.svg', alt: '' }}
            />
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="search-results-list">
              <Text variant="subheader-1" className="search-results-count">
                Найдено результатов: {searchResults.length}
              </Text>

              <div className={!isMobile && gridView ? 'search-results-posts search-results-posts_grid' : 'search-results-posts'}>
                {searchResults.map((post, index) => (
                  <BlogPostCard
                    key={post.id}
                    post={post}
                    gridView={gridView}
                    isPriority={gridView ? index < 4 : index < 2}
                    showReadButton={true}
                    readButtonText={readButtonText}
                    onReadClick={() => handleResultClick(post)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
