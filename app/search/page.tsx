"use client"
import { useState, useEffect } from 'react';
import SearchComponent from '@/app/components/SearchComponent';
import ImageSearchComponent from '@/app/components/ImageSearchComponent';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/components/SearchComponent';
import { Text, TabProvider, TabList, Tab, TabPanel } from '@gravity-ui/uikit';
import './Search.css';

type SearchTab = 'blog' | 'images';

export default function SearchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>('blog');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('user_id');
      setUserId(id);
    }
  }, []);

  const handleSearchResultClick = (result: SearchResult) => {
    router.push(`/blog/${result.slug}`);
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <Text variant="display-1">Search</Text>
        
        <div className="search-tabs-container">
          <TabProvider value={activeTab} onUpdate={(value: string) => setActiveTab(value as SearchTab)}>
            <TabList size="l" className="search-tab-list">
              <Tab value="blog">Search arcticles</Tab>
              <Tab value="images">Search images</Tab>
            </TabList>
            
            <TabPanel value="blog" className="search-tab-content">
              <SearchComponent
                placeholder="Enter your search query"
                noResultsText="Nothing found"
                noResultsSubText="Попробуйте изменить поисковый запрос"
                startSearchText="Start typing...s"
                startSearchSubText="Введите ключевые слова для поиска по заголовкам, описаниям и содержимому постов"
                readButtonText="Read"
                onResultClick={handleSearchResultClick}
              />
            </TabPanel>
            
            <TabPanel value="images" className="search-tab-content">
              <ImageSearchComponent
                userId={userId}
              />
            </TabPanel>
          </TabProvider>
        </div>
      </div>
    </div>
  );
}
