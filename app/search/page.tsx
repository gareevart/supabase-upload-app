"use client"
import { useState, useEffect } from 'react';
import { Text, TextInput, Card, Button, Skeleton, Icon } from '@gravity-ui/uikit';
import { Magnifier, Calendar, Person } from '@gravity-ui/icons';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import './Search.css';

type SearchResult = {
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

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
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
    }, 300);

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

  return (
    <div className="page-container">
      <div className="content-container max-w-4xl mx-auto p-4">
        <Text variant="display-1" className="mb-1">Поиск</Text>
        
          <TextInput
            size="xl"
            placeholder="Введите запрос для поиска..."
            value={searchQuery}
            onUpdate={setSearchQuery}
            startContent={<Icon data={Magnifier} size={20} className='LeftIcon'/>}
          />

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
              Ничего не найдено
            </Text>
            <Text variant="body-1" color="secondary">
              Попробуйте изменить поисковый запрос
            </Text>
          </Card>
        )}

        {!isLoading && searchResults.length > 0 && (
          <div className="space-y-6">
            <Text variant="subheader-1" className="mb-4">
              Найдено результатов: {searchResults.length}
            </Text>
            
            {searchResults.map((post) => (
              <Card key={post.id} className="w-full overflow-hidden">
                <div className="flex">
                  {post.featured_image && (
                    <div className="w-48 h-32 flex-shrink-0 overflow-hidden">
                      <Link href={`/blog/${post.slug}`}>
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
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
                        onClick={() => window.location.href = `/blog/${post.slug}`}
                      >
                        Читать
                      </Button>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!hasSearched && (
          <Card className="w-full text-center p-8">
            <Text variant="subheader-1" className="mb-2">
              Начните поиск
            </Text>
            <Text variant="body-1" color="secondary">
              Введите ключевые слова для поиска по заголовкам и описаниям постов
            </Text>
          </Card>
        )}
      </div>
    </div>
  );
}
