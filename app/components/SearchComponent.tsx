"use client"
import { useState, useEffect, useCallback } from 'react';
import { Text, TextInput, Card, Button, Skeleton, Icon } from '@gravity-ui/uikit';
import { Magnifier, Calendar, Person } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import { extractPlainText, extractSearchContext } from '@/lib/tiptapConverter';
import Link from 'next/link';
import Image from 'next/image';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
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

interface SearchComponentProps {
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
  onUpdate
}: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
      const searchTerm = query.toLowerCase();
      
      // Сначала поиск по заголовку и описанию в базе данных
      const { data: titleExcerptResults, error: titleError } = await supabase
        .from('blog_posts')
        .select(`
          id, 
          title, 
          excerpt, 
          slug, 
          featured_image,
          created_at,
          author_id
        `)
        .eq('published', true)
        .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (titleError) throw titleError;

      // Затем получаем все опубликованные посты для поиска по содержимому
      const { data: allPosts, error: contentError } = await supabase
        .from('blog_posts')
        .select(`
          id, 
          title, 
          excerpt, 
          content,
          slug, 
          featured_image,
          created_at,
          author_id
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (contentError) throw contentError;

      // Поиск по содержимому на клиенте с извлечением контекста
      const contentResults: Array<{
        id: string;
        title: string;
        excerpt: string | null;
        slug: string | null;
        featured_image: string | null;
        created_at: string | null;
        author_id: string;
        searchContext: { context: string; highlightedContext: string } | null;
      }> = [];

      for (const post of allPosts || []) {
        // Пропускаем посты, которые уже найдены по заголовку/описанию
        const alreadyFound = (titleExcerptResults || []).some(found => found.id === post.id);
        if (alreadyFound) continue;

        // Извлекаем текст из содержимого и ищем в нем
        try {
          const plainText = extractPlainText(post.content);
          if (plainText.toLowerCase().includes(searchTerm)) {
            // Извлекаем контекст вокруг найденного термина
            const searchContext = extractSearchContext(plainText, query, 3, 5);
            
            contentResults.push({
              id: post.id,
              title: post.title,
              excerpt: post.excerpt,
              slug: post.slug,
              featured_image: post.featured_image,
              created_at: post.created_at,
              author_id: post.author_id,
              searchContext
            });
          }
        } catch (error) {
          console.error('Error extracting text from content:', error);
        }
      }

      // Объединяем результаты (сначала по заголовку/описанию, затем по содержимому)
      const combinedResults = [
        ...(titleExcerptResults || []).map(post => ({
          ...post,
          searchContext: null
        })),
        ...contentResults
      ];

      // Ограничиваем количество результатов
      const limitedResults = combinedResults.slice(0, 20);

      // Получаем информацию об авторах
      if (limitedResults.length > 0) {
        const authorIds = [...new Set(limitedResults.map(post => post.author_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url')
          .in('id', authorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Создаем карту профилей
        const profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);

        // Объединяем посты с информацией об авторах
        const resultsWithAuthors = limitedResults.map(post => ({
          ...post,
          author: profilesMap[post.author_id] || {
            name: null,
            username: null,
            avatar_url: null
          }
        }));

        setSearchResults(resultsWithAuthors);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleResultClick = (post: SearchResult) => {
    if (onResultClick) {
      onResultClick(post);
    }
  };

  return (
    <div className={`search-container relative ${className}`}>
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
        startContent={<Icon data={Magnifier} size={20} className='search-left-icon'/>}
      />

      {(isLoading || hasSearched) && (
        <div className="search-results-container w-full absolute left-0 right-0 z-10 mt-2">
          {isLoading && (
            <div className="w-full space-y-4">
              {[1, 2, 3].map((index) => (
                <Card key={index} className="w-full">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
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
            <div className="w-full space-y-6">
              <Text variant="subheader-1" className="mb-4">
                Найдено результатов: {searchResults.length}
              </Text>
              
              {searchResults.map((post) => (
                <Card key={post.id} className="w-full overflow-hidden search-result-card">
                  <div className="flex">
                    {post.featured_image && (
                      <div className="w-48 h-32 flex-shrink-0 overflow-hidden">
                        <Link href={`/blog/${post.slug}`}>
                          <Image
                            src={post.featured_image}
                            alt={post.title}
                            width={192}
                            height={128}
                            className="search-result-image"
                          />
                        </Link>
                      </div>
                    )}
                    <div className="flex-1">
                      <CardHeader>
                        <CardTitle className="text-xl">
                          <Link
                            href={post.slug ? `/blog/${post.slug}` : '#'}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {post.title}
                          </Link>
                        </CardTitle>
                        {post.excerpt && !post.searchContext && (
                          <CardDescription className="line-clamp-2">
                            {post.excerpt}
                          </CardDescription>
                        )}
                        {post.searchContext && (
                          <CardDescription className="line-clamp-2">
                            <span
                              className="search-context"
                              dangerouslySetInnerHTML={{
                                __html: post.searchContext.highlightedContext
                              }}
                            />
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter className="flex justify-between items-center">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Icon data={Calendar} size={16} />
                            {post.created_at ? formatDate(post.created_at) : 'Без даты'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon data={Person} size={16} />
                            {post.author?.name || post.author?.username || 'Аноним'}
                          </div>
                        </div>
                        <Button
                          view="normal"
                          size="m"
                          onClick={() => {
                            handleResultClick(post);
                            if (!onResultClick) {
                              window.location.href = `/blog/${post.slug}`;
                            }
                          }}
                        >
                          {readButtonText}
                        </Button>
                      </CardFooter>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
