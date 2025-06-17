"use client"
import SearchComponent from '@/app/components/SearchComponent';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/components/SearchComponent';
import { Text } from '@gravity-ui/uikit';

export default function SearchPage() {
  const router = useRouter();

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`);
  };

  return (
    <div className="page-container">
      <div className="content-container">
       <Text variant="display-1">Search</Text>
        <SearchComponent
          placeholder="Введите запрос для поиска..."
          noResultsText="Ничего не найдено"
          noResultsSubText="Попробуйте изменить поисковый запрос"
          startSearchText="Начните поиск"
          startSearchSubText="Введите ключевые слова для поиска по заголовкам и описаниям постов"
          readButtonText="Читать"
          onResultClick={handleSearchResultClick}
        />
      </div>
      </div>
  );
}
