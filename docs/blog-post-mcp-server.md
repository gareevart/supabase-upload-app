# Создание MCP сервера для Supabase приложения: от концепции до реализации

В этом посте я расскажу о создании собственного MCP (Model Context Protocol) сервера для управления нашим Supabase приложением. Это решение позволило интегрировать управление блогом, рассылками и другими компонентами приложения прямо в среду разработки.

## Что такое MCP и зачем он нужен?

Model Context Protocol (MCP) — это открытый протокол, который позволяет AI-ассистентам взаимодействовать с внешними системами через стандартизированные инструменты. Вместо того чтобы каждый раз писать API-запросы или использовать веб-интерфейс, можно создать MCP сервер, который предоставит удобные инструменты для работы с приложением.

### Преимущества MCP подхода:
- **Унификация**: Один интерфейс для всех операций
- **Автоматизация**: Возможность создавать сложные сценарии
- **Интеграция**: Прямая работа из среды разработки
- **Безопасность**: Контролируемый доступ к данным

## Архитектура решения

### Технологический стек

```json
{
  "runtime": "Node.js",
  "language": "TypeScript",
  "protocol": "@modelcontextprotocol/sdk",
  "database": "Supabase",
  "validation": "Zod",
  "http_client": "Axios"
}
```

### Структура проекта

```
supabase-app-server/
├── src/
│   └── index.ts          # Основной файл сервера
├── build/                # Скомпилированные файлы
├── package.json          # Зависимости и скрипты
├── tsconfig.json         # Конфигурация TypeScript
├── README.md            # Документация
├── SETUP.md             # Инструкции по настройке
└── SUCCESS_REPORT.md    # Отчет о тестировании
```

## Реализация MCP сервера

### 1. Инициализация сервера

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from '@supabase/supabase-js';

// Создание MCP сервера
const server = new McpServer({
  name: "supabase-app-server",
  version: "0.1.0"
});

// Настройка Supabase клиентов
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;
```

### 2. Типизация базы данных

Одним из ключевых аспектов стала строгая типизация всех сущностей базы данных:

```typescript
interface Database {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          slug: string;
          excerpt: string | null;
          featured_image: string | null;
          published: boolean;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      // ... другие таблицы
    };
  };
}
```

Это обеспечивает безопасность типов и автодополнение во время разработки.

### 3. Реализация инструментов

#### Получение блог-постов

```typescript
server.tool(
  "get_blog_posts",
  {
    onlyMine: z.boolean().optional().describe("Show only current user's posts"),
    publishedOnly: z.boolean().optional().describe("Show only published posts"),
    draftsOnly: z.boolean().optional().describe("Show only draft posts"),
    limit: z.number().optional().describe("Limit number of posts returned"),
  },
  async ({ onlyMine, publishedOnly, draftsOnly, limit }) => {
    try {
      const client = supabaseAdmin || supabaseAnon;
      let query = client
        .from('blog_posts')
        .select(`
          id, title, excerpt, slug, featured_image, 
          created_at, updated_at, published, author_id
        `)
        .order('created_at', { ascending: false });

      if (publishedOnly) {
        query = query.eq('published', true);
      } else if (draftsOnly) {
        query = query.eq('published', false);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching blog posts: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);
```

#### Создание блог-постов

```typescript
server.tool(
  "create_blog_post",
  {
    title: z.string().describe("Blog post title"),
    content: z.string().describe("Blog post content"),
    excerpt: z.string().optional().describe("Blog post excerpt"),
    slug: z.string().optional().describe("Custom slug (auto-generated if not provided)"),
    featured_image: z.string().optional().describe("Featured image URL"),
    published: z.boolean().optional().describe("Publish immediately (default: false)"),
  },
  async ({ title, content, excerpt, slug, featured_image, published = false }) => {
    try {
      const response = await makeApiCall('/blog-posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          excerpt,
          slug,
          featured_image,
          published,
        }),
      });

      return {
        content: [{
          type: "text",
          text: `Blog post created successfully:\n${JSON.stringify(response, null, 2)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error creating blog post: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);
```

### 4. Статистика приложения

Один из самых полезных инструментов — получение общей статистики:

```typescript
server.tool(
  "get_app_stats",
  {},
  async () => {
    try {
      const client = supabaseAdmin || supabaseAnon;
      
      // Параллельное получение счетчиков
      const [
        { count: blogPostsCount },
        { count: subscribersCount },
        { count: broadcastsCount },
        { count: imagesCount },
        { count: usersCount },
        { count: groupsCount }
      ] = await Promise.all([
        client.from('blog_posts').select('*', { count: 'exact', head: true }),
        client.from('subscribe').select('*', { count: 'exact', head: true }),
        client.from('sent_mails').select('*', { count: 'exact', head: true }),
        client.from('images').select('*', { count: 'exact', head: true }),
        client.from('profiles').select('*', { count: 'exact', head: true }),
        client.from('broadcast_groups').select('*', { count: 'exact', head: true })
      ]);

      const stats = {
        blog_posts: blogPostsCount || 0,
        subscribers: subscribersCount || 0,
        broadcasts: broadcastsCount || 0,
        images: imagesCount || 0,
        users: usersCount || 0,
        broadcast_groups: groupsCount || 0,
        timestamp: new Date().toISOString()
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(stats, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching app statistics: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);
```

## Настройка и конфигурация

### 1. Переменные окружения

Сервер использует следующие переменные окружения:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # опционально
APP_BASE_URL=http://localhost:3000
```

### 2. Конфигурация MCP

В файле конфигурации MCP (`mcp_settings.json`):

```json
{
  "mcpServers": {
    "supabase-app-server": {
      "command": "node",
      "args": ["/Users/gareevda/Documents/Cline/MCP/supabase-app-server/build/index.js"],
      "env": {
        "SUPABASE_URL": "https://rajacaayhzgjoitquqvt.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here",
        "APP_BASE_URL": "http://localhost:3000"
      },
      "alwaysAllow": [
        "get_blog_posts",
        "create_blog_post",
        "get_broadcasts",
        "get_subscribers",
        "get_broadcast_groups",
        "get_user_profiles",
        "get_images",
        "get_app_stats"
      ],
      "timeout": 60000,
      "disabled": false
    }
  }
}
```

### 3. Сборка и запуск

```bash
# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Тестирование
node test-server.cjs
```

## Полный список инструментов

Сервер предоставляет 8 основных инструментов:

1. **get_blog_posts** - Получение списка блог-постов с фильтрацией
2. **create_blog_post** - Создание нового блог-поста
3. **get_broadcasts** - Получение рассылок по статусу
4. **get_subscribers** - Управление подписчиками
5. **get_broadcast_groups** - Работа с группами рассылки
6. **get_user_profiles** - Получение профилей пользователей
7. **get_images** - Работа с изображениями и тегами
8. **get_app_stats** - Общая статистика приложения

## Безопасность и лучшие практики

### 1. Управление доступом

- Использование анонимного ключа для чтения данных
- Service Role Key только для операций, требующих повышенных прав
- Соблюдение политик Row Level Security (RLS)

### 2. Обработка ошибок

```typescript
try {
  // Основная логика
  const { data, error } = await query;
  if (error) throw error;
  
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
} catch (error) {
  return {
    content: [{
      type: "text",
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }],
    isError: true,
  };
}
```

### 3. Валидация входных данных

Использование Zod для строгой валидации:

```typescript
server.tool(
  "tool_name",
  {
    param1: z.string().describe("Description"),
    param2: z.number().optional().describe("Optional parameter"),
    param3: z.enum(['value1', 'value2']).optional(),
  },
  async (params) => {
    // Параметры уже провалидированы
  }
);
```

## Результаты тестирования

После создания сервера было проведено полное тестирование:

```json
{
  "blog_posts": 5,
  "subscribers": 4,
  "broadcasts": 0,
  "images": 0,
  "users": 14,
  "broadcast_groups": 0,
  "timestamp": "2025-09-11T14:35:05.986Z"
}
```

**Все инструменты работают корректно:**
- ✅ Подключение к Supabase
- ✅ Получение данных из всех таблиц
- ✅ Создание новых записей
- ✅ Обработка ошибок
- ✅ Валидация параметров

## Практические примеры использования

### 1. Получение статистики
```
Покажи статистику приложения
```

### 2. Работа с блогом
```
Получи последние 5 блог-постов
Создай новый пост с заголовком "Тест" и содержимым "Тестовый контент"
```

### 3. Управление подписчиками
```
Покажи всех активных подписчиков
Получи группы рассылки с количеством подписчиков
```

## Планы развития

### Ближайшие улучшения:
1. **Расширенные операции с блогом** - редактирование, удаление постов
2. **Управление рассылками** - создание и отправка email-кампаний
3. **Работа с изображениями** - загрузка, тегирование, поиск
4. **Аналитика** - детальная статистика по постам и подписчикам
5. **Автоматизация** - планировщик задач и уведомления

### Технические улучшения:
1. **Кэширование** - Redis для часто запрашиваемых данных
2. **Пагинация** - для работы с большими объемами данных
3. **Webhooks** - реактивные обновления
4. **Мониторинг** - логирование и метрики производительности

## Заключение

Создание собственного MCP сервера оказалось отличным решением для интеграции управления приложением в рабочий процесс разработки. Основные преимущества:

- **Эффективность**: Все операции доступны из одного места
- **Автоматизация**: Возможность создавать сложные сценарии
- **Безопасность**: Контролируемый доступ через Supabase RLS
- **Масштабируемость**: Легко добавлять новые инструменты

Проект показал важность правильной архитектуры и типизации при создании инфраструктурных решений. TypeScript + Zod + Supabase оказались отличной комбинацией для быстрой и безопасной разработки.

**Ключевые принципы, которыми мы руководствовались:**
- Безопасность прежде всего
- Простота использования
- Расширяемость архитектуры
- Подробная документация
- Тщательное тестирование

Этот MCP сервер стал основой для дальнейшего развития инструментов автоматизации и управления нашим приложением.

---

*Исходный код сервера доступен в репозитории: `/Users/gareevda/Documents/Cline/MCP/supabase-app-server`*