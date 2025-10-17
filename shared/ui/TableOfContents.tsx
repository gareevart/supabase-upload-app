"use client";

import React, { useState, useEffect } from 'react';
import { Card, Text, List, Link } from '@gravity-ui/uikit';

interface TocItem {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  content: any;
  className?: string;
}

/**
 * Компонент Table of Contents для отображения структуры статьи
 * Извлекает заголовки из TipTap контента и создает навигацию
 */
export const TableOfContents: React.FC<TableOfContentsProps> = ({ content, className = '' }) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Извлекаем заголовки из TipTap контента
    const extractHeadings = (contentData: any): TocItem[] => {
      const items: TocItem[] = [];
      
      try {
        let parsedContent = contentData;
        
        // Парсим контент если это строка
        if (typeof contentData === 'string') {
          parsedContent = JSON.parse(contentData);
        }
        
        // Проверяем, что это TipTap документ
        if (parsedContent?.type === 'doc' && Array.isArray(parsedContent.content)) {
          parsedContent.content.forEach((node: any, index: number) => {
            if (node.type === 'heading' && node.content) {
              // Извлекаем текст из заголовка
              const text = node.content
                .map((textNode: any) => textNode.text || '')
                .join('');
              
              if (text) {
                const level = node.attrs?.level || 1;
                // Создаем уникальный ID на основе текста
                const id = `heading-${index}-${text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`;
                
                items.push({
                  id,
                  level,
                  text
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Error extracting headings:', error);
      }
      
      return items;
    };

    const extracted = extractHeadings(content);
    setHeadings(extracted);

    // Добавляем ID к заголовкам на странице для навигации
    const addIdsToHeadings = () => {
      extracted.forEach((heading) => {
        const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        elements.forEach((element) => {
          if (element.textContent?.trim() === heading.text && !element.id) {
            element.id = heading.id;
          }
        });
      });
    };

    // Небольшая задержка чтобы убедиться, что контент отрендерен
    const timeoutId = setTimeout(addIdsToHeadings, 100);

    return () => clearTimeout(timeoutId);
  }, [content]);

  // Отдельный useEffect для отслеживания скролла
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const element = document.getElementById(heading.id);
        
        if (element && element.offsetTop <= scrollPosition) {
          setActiveId(heading.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Вызываем сразу для установки начального состояния

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Отступ сверху
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <Card className="grid p-4" size="l">
      <Text variant="subheader-3" className='pb-4'>
        Содержание
      </Text>
      <List
        filterable={false}
        sortable={false}
        virtualized={false}
        items={headings}
        renderItem={(heading) => {
          const isActive = activeId === heading.id;
          const paddingLeft = (heading.level - 1) * 16;
          
          return (
            <div
              style={{
                paddingLeft: `${paddingLeft}px`,
                borderLeft: isActive ? '4px solid var(--g-color-base-brand)' : '4px solid transparent',
                borderRadius: '0px 8px 8px 0px',
                transition: 'all 0.2s ease',
              }}
            >
              <Link
                href={`#${heading.id}`}
                view={isActive ? 'primary' : 'secondary'}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(heading.id);
                }}
                style={{
                  display: 'block',
                  padding: '8px',
                  fontSize: heading.level === 1 ? '14px' : heading.level === 2 ? '13px' : '12px',
                  fontWeight: heading.level === 1 ? 600 : heading.level === 2 ? 500 : 400,
                }}
              >
                {heading.text}
              </Link>
            </div>
          );
        }}
      />
    </Card>
  );
};

export default TableOfContents;

