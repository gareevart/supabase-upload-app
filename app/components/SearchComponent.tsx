"use client"
import { useState, useEffect } from 'react';
import { Text, TextInput, Card, Button, Skeleton, Icon } from '@gravity-ui/uikit';
import { Magnifier, Calendar, Person } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
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
  startSearchSubText = "Введите ключевые слова для поиска по заголовкам и описаниям постов",
  readButtonText = "Читать",
  className = "",
  onResultClick,
  onUpdate
}: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (query: string) => {
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
      // Поиск по заголовку и описанию
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Получаем информацию об авторах
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(post => post.author_id))];
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
        const resultsWithAuthors = data.map(post => ({
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
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
    <div className={`search-container ${className}`}>
      <TextInput
        size="xl"
        placeholder={placeholder}
        value={searchQuery}
        onUpdate={(value) => {
          setSearchQuery(value);
          if (onUpdate) {
            onUpdate(value);
          }
        }}
        startContent={<Icon data={Magnifier} size={20} className='search-left-icon'/>}
      />

      <div className="search-results-container">
        {isLoading && (
          <div className="space-y-4">
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
          <div className="space-y-6">
            <Text variant="subheader-1" className="mb-4">
              Найдено результатов: {searchResults.length}
            </Text>
            
            {searchResults.map((post) => (
              <Card key={post.id} className="w-full overflow-hidden search-result-card">
                <div className="flex">
                  {post.featured_image && (
                    <div className="w-48 h-32 flex-shrink-0 overflow-hidden">
                      <Link href={`/blog/${post.slug}`}>
                        <img
                          src={post.featured_image}
                          alt={post.title}
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
                      {post.excerpt && (
                        <CardDescription className="line-clamp-2">
                          {post.excerpt}
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
    </div>
  );
}