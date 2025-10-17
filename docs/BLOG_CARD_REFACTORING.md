# Рефакторинг карточек блога

## Обзор изменений

Выполнен рефакторинг карточек блога на странице `/blog` с целью улучшения архитектуры и пользовательского опыта.

## Что сделано

### 1. Создан переиспользуемый компонент `BlogPostCard`

**Файл:** `/shared/ui/BlogPostCard.tsx`

Компонент поддерживает два режима отображения:

#### Grid View (gridView=true)
- Вертикальная карточка
- Изображение сверху (100% ширины, высота 192px)
- Контент снизу
- Используется для сетки постов

#### List View (gridView=false)
- Горизонтальная карточка
- Изображение слева (30% ширины, минимум 200px)
- Контент справа (70% ширины)
- Используется для списка постов и результатов поиска

### 2. Обновлен компонент `PostList`

**Файл:** `/app/blog/PostList.tsx`

**Изменения:**
- Убрана встроенная верстка карточек
- Интегрирован компонент `BlogPostCard`
- Упрощен код (с ~230 до ~160 строк)
- Улучшена читаемость и поддерживаемость

**До:**
```typescript
// Верстка была встроена прямо в map
<Card size="l" key={post.id}>
  <div className="p-2">
    {/* ... много кода ... */}
  </div>
</Card>
```

**После:**
```typescript
<BlogPostCard
  key={post.id}
  post={post as BlogPost}
  gridView={gridView}
  isPriority={isPriority}
  isDraft={draftsOnly}
  onEdit={handleEditPost}
  onDelete={handleDeletePost}
  isDeleting={deletingPostId === post.id}
/>
```

### 3. Улучшен List View

Теперь в режиме List View карточки отображаются горизонтально:

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌────────────────────────────────┐       │
│ │          │  │ Заголовок поста                 │       │
│ │  Image   │  │ Описание поста...              │       │
│ │  (30%)   │  │                                 │       │
│ │          │  │ 📅 Дата       [Read Button] ──→ │       │
│ └──────────┘  └────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### 4. Создан индексный файл для shared/ui

**Файл:** `/shared/ui/index.ts`

Упрощает импорты:
```typescript
// До
import { BlogPostCard } from '@/shared/ui/BlogPostCard';

// После (опционально)
import { BlogPostCard } from '@/shared/ui';
```

## Особенности реализации

### Адаптивные пропорции изображений

- **Grid View:** `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`
- **List View:** `sizes="(max-width: 768px) 100vw, 30vw"`

### Приоритетная загрузка

- Grid View: первые 4 изображения загружаются с приоритетом
- List View: первые 2 изображения загружаются с приоритетом

### Поддержка черновиков

Компонент поддерживает отображение черновиков с кнопками:
- ✏️ Edit - редактирование черновика
- 🗑️ Delete - удаление черновика

### Поддержка результатов поиска

Компонент поддерживает отображение контекста поиска через `searchContext`:
```typescript
post.searchContext?.highlightedContext
```

## Интеграция

### PostList (страница блога)
```typescript
<BlogPostCard
  post={post}
  gridView={gridView}
  isPriority={isPriority}
  isDraft={draftsOnly}
  onEdit={handleEditPost}
  onDelete={handleDeletePost}
  isDeleting={deletingPostId === post.id}
/>
```

### SearchComponent (результаты поиска)
```typescript
<BlogPostCard
  post={post}
  gridView={false}
  isPriority={index < 2}
  showReadButton={true}
  readButtonText="Read"
  onReadClick={handleResultClick}
/>
```

## Преимущества

1. **Переиспользуемость**: Один компонент используется в нескольких местах
2. **Консистентность**: Единый дизайн карточек по всему приложению
3. **Поддерживаемость**: Изменения в одном месте применяются везде
4. **Читаемость**: Код стал значительно чище и понятнее
5. **FSD архитектура**: Следует принципам Feature-Sliced Design
6. **UX улучшения**: List View теперь более информативен и компактен

## Совместимость

- ✅ Работает с Grid View
- ✅ Работает с List View
- ✅ Работает на мобильных устройствах
- ✅ Поддерживает черновики
- ✅ Поддерживает результаты поиска
- ✅ Поддерживает оптимизацию изображений

## Технологии

- **UI Framework**: Gravity UI (следуя user rules)
- **Styling**: Tailwind CSS (inline classes)
- **Images**: Next.js Image с оптимизацией
- **Icons**: @gravity-ui/icons

## Файлы затронуты

- ✅ `/shared/ui/BlogPostCard.tsx` - обновлен
- ✅ `/app/blog/PostList.tsx` - обновлен
- ✅ `/shared/ui/index.ts` - создан
- ✅ `/app/components/SearchComponent.tsx` - уже использовал компонент

