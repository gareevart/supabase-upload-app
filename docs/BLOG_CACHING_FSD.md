# Кэширование данных блога с использованием SWR и FSD подхода

## Проблема

При каждом переходе на страницу `/blog` происходила повторная загрузка статей из базы данных, что создавало:
- Лишнюю нагрузку на базу данных Supabase
- Медленную загрузку страницы при повторных посещениях
- Увеличенное потребление трафика

## Решение

Реализовано клиентское кэширование с использованием библиотеки **SWR** (stale-while-revalidate) согласно принципам **Feature-Sliced Design (FSD)**.

### Архитектура решения

```
shared/
├── api/
│   └── blog/
│       ├── types.ts      # Типы для API блога
│       ├── api.ts        # API методы (fetchBlogPosts, deleteBlogPost, etc.)
│       └── index.ts      # Экспорт
└── lib/
    └── hooks/
        ├── useBlogPosts.ts  # Хуки с SWR кэшированием
        └── index.ts         # Экспорт
```

### Компоненты решения

#### 1. Shared API Layer (`shared/api/blog`)

**Типы данных** (`types.ts`):
```typescript
export type BlogPost = {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  published: boolean;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
};

export type BlogPostFilters = {
  publishedOnly?: boolean;
  draftsOnly?: boolean;
  onlyMyPosts?: boolean;
  authorId?: string;
  page?: number;
  pageSize?: number;
};

export type BlogPostsResponse = {
  posts: BlogPost[];
  totalCount: number;
  page: number;
  pageSize: number;
};
```

**API методы** (`api.ts`):
- `fetchBlogPosts(filters)` - получение списка постов с фильтрацией и пагинацией
- `checkUserHasDrafts(userId)` - проверка наличия черновиков
- `deleteBlogPost(postId)` - удаление поста

#### 2. Shared Hooks Layer (`shared/lib/hooks`)

**Хуки с SWR кэшированием** (`useBlogPosts.ts`):

- `useBlogPosts(filters)` - хук для получения постов с автоматическим кэшированием
- `useUserDrafts()` - хук для проверки черновиков пользователя
- `useAuth()` - хук для получения информации об аутентификации

#### 3. Глобальная конфигурация SWR

В корневом `layout.tsx` добавлен `SWRConfig` провайдер с глобальными настройками:

```typescript
<SWRConfig 
  value={{
    dedupingInterval: 5 * 60 * 1000,      // 5 минут дедупликации
    revalidateOnFocus: false,              // Отключена ревалидация при фокусе
    revalidateOnReconnect: false,          // Отключена ревалидация при восстановлении соединения
    errorRetryCount: 3,                    // 3 повторные попытки при ошибке
    errorRetryInterval: 1000,              // 1 секунда между попытками
    provider: () => new Map(),             // Провайдер кэша
  }}
>
```

### Параметры кэширования

#### Время жизни кэша
- **Дедупликация запросов**: 5 минут
- При повторном запросе в течение 5 минут данные берутся из кэша без обращения к серверу

#### Ревалидация
- **При фокусе окна**: отключена (избегаем лишних запросов)
- **При восстановлении соединения**: отключена
- **Ручная ревалидация**: доступна через функцию `mutate()`

#### Обработка ошибок
- **Количество повторных попыток**: 3
- **Интервал между попытками**: 1 секунда

### Оптимизация загрузки изображений (LCP)

Для улучшения Core Web Vitals метрики LCP (Largest Contentful Paint) реализована приоритетная загрузка первых изображений:

```typescript
{posts.map((post, index) => {
  // Приоритетная загрузка для первых изображений (above the fold)
  // В grid view - первые 4 изображения, в list view - первые 2
  const isPriority = gridView ? index < 4 : index < 2;
  
  return (
    <Image
      src={post.featured_image}
      priority={isPriority}
      loading={isPriority ? undefined : "lazy"}
    />
  );
})}
```

**Логика:**
- В режиме сетки (grid view): первые 4 изображения загружаются с приоритетом
- В режиме списка (list view): первые 2 изображения загружаются с приоритетом
- Остальные изображения используют lazy loading

Это устраняет Next.js warning:
```
Image with src "..." was detected as the Largest Contentful Paint (LCP). 
Please add the "priority" property if this image is above the fold.
```

### Использование в компонентах

#### В PostList компоненте:

**До:**
```typescript
const [posts, setPosts] = useState<Post[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchPosts = async () => {
    // Множество строк кода для загрузки данных
    const { data, error } = await supabase.from("blog_posts")...
    setPosts(data);
    setIsLoading(false);
  };
  fetchPosts();
}, [dependencies]);
```

**После:**
```typescript
const { posts, totalCount, isLoading, mutate } = useBlogPosts({
  publishedOnly,
  draftsOnly,
  onlyMyPosts,
  authorId: onlyMyPosts ? userId || undefined : undefined,
  page: currentPage,
  pageSize: POSTS_PER_PAGE,
});
```

#### В page компоненте:

**До:**
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [hasDrafts, setHasDrafts] = useState(false);

useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // Логика проверки...
  };
  checkAuth();
}, []);
```

**После:**
```typescript
const { isAuthenticated } = useAuth();
const { hasDrafts, userId } = useUserDrafts();
```

### Преимущества решения

✅ **Производительность**
- Данные кэшируются на 5 минут
- Повторные запросы не обращаются к базе данных
- Мгновенная загрузка при возврате на страницу
- Оптимизация LCP (Largest Contentful Paint) с priority для первых изображений

✅ **Снижение нагрузки на БД**
- Минимум запросов к Supabase
- Дедупликация одновременных запросов

✅ **Улучшение UX**
- Быстрая навигация между страницами
- Нет "мерцания" при повторной загрузке
- Приоритетная загрузка видимых изображений

✅ **Чистый код (FSD)**
- Разделение ответственности: API, хуки, компоненты
- Переиспользуемые хуки
- Легкая поддержка и тестирование

✅ **Гибкость**
- Ручная ревалидация через `mutate()`
- Настраиваемое время кэширования
- Автоматическая обработка ошибок

### Примеры использования

#### Получение опубликованных постов:
```typescript
const { posts, isLoading } = useBlogPosts({
  publishedOnly: true,
  page: 1,
  pageSize: 10,
});
```

#### Получение черновиков пользователя:
```typescript
const { posts, isLoading } = useBlogPosts({
  draftsOnly: true,
  onlyMyPosts: true,
  authorId: userId,
});
```

#### Ручная ревалидация после удаления:
```typescript
const { mutate } = useBlogPosts(filters);

const handleDelete = async (postId: string) => {
  await deleteBlogPost(postId);
  mutate(); // Обновляем кэш
};
```

### Мониторинг и отладка

SWR предоставляет встроенные инструменты для отладки:

```typescript
// В компоненте
const { posts, isLoading, error } = useBlogPosts(filters);

if (error) {
  console.error('Ошибка загрузки постов:', error);
}
```

### Дальнейшие улучшения

🔄 **Возможные оптимизации:**
- Добавить localStorage провайдер для персистентного кэша
- Реализовать optimistic updates для удаления/редактирования
- Добавить prefetching для следующих страниц пагинации
- Настроить фоновую ревалидацию для "свежести" данных

### Связанные файлы

- `/shared/api/blog/` - API слой для работы с блогом
- `/shared/lib/hooks/useBlogPosts.ts` - Хуки с кэшированием
- `/app/blog/PostList.tsx` - Компонент списка постов
- `/app/blog/page.tsx` - Страница блога
- `/app/layout.tsx` - Корневой layout с SWRConfig

---

**Дата создания**: 1 октября 2025  
**Автор**: Реализовано согласно принципам FSD

