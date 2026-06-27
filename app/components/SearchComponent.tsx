"use client"
import { useState, useEffect, useCallback } from 'react';
import { Text, TextInput, Card, Skeleton, Icon } from '@gravity-ui/uikit';
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
  expandOnFocus = false
}: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = useIsMobile();

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      if (onUpdate) {
        onUpdate('');
      }
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      // Search runs entirely server-side now (title/excerpt + content scan +
      // author join). Only the matched results cross the wire.
      const res = await fetch(`/api/blog-posts/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search request failed');
      const json = await res.json();
      setSearchResults(json.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
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
      className={`search-container relative z-[200] ${className} ${expandOnFocus && isFocused ? 'expanded' : ''}`}
    >
      <TextInput
        size="l"
        hasClear={true}
        placeholder={placeholder}
        value={searchQuery}
        onUpdate={(value) => {
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
        <div className={`search-results-container w-full relative z-[200] ${isMobile ? 'mt-8' : 'mt-6'}`}>
          {isLoading && (
            <div className="w-full space-y-4">
              {[1, 2, 3].map((index) => (
                <Card key={index} className="w-full min-w-[280px] overflow-hidden" size="l">
                  <div className="p-2">
                    <div className="h-48 w-full rounded-lg">
                      <Skeleton className="h-full w-full" />
                    </div>
                  </div>
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && searchResults.length === 0 && (
            <Card className="w-full text-center p-8">
              <Text variant="subheader-1" className="mb-2">
                {noResultsText}
              </Text>
              <Text variant="body-1" color="secondary">
                {noResultsSubText}
              </Text>
            </Card>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="w-full">
              <Text variant="subheader-1" className="pb-2">
                Найдено результатов: {searchResults.length}
              </Text>

              <div className={`${!isMobile ? 'space-y-6' : 'space-y-4'}`}>
                {searchResults.map((post, index) => (
                  <BlogPostCard
                    key={post.id}
                    post={post}
                    gridView={false}
                    isPriority={index < 2}
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
