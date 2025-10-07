# Broadcasts FSD Migration

## Обзор

Функционал broadcasts был переписан с использованием архитектуры Feature-Sliced Design (FSD) для улучшения структуры кода, переиспользования и тестируемости.

## Новая структура

### Shared слой
- `shared/types/` - общие типы для всего приложения
- `shared/api/` - API клиенты
- `shared/lib/` - общие утилиты

### Entities слой
- `entities/broadcast/` - сущность broadcast
- `entities/user/` - сущность пользователя

### Features слой
- `features/broadcast-list/` - функционал списка рассылок
- `features/broadcast-detail/` - функционал детального просмотра
- `features/broadcast-form/` - функционал создания/редактирования
- `features/auth/` - функционал авторизации

### Widgets слой
- `widgets/broadcast-list/` - виджет списка рассылок
- `widgets/broadcast-detail/` - виджет детального просмотра
- `widgets/broadcast-form/` - виджет формы

### Pages слой
- `pages/broadcasts/` - страницы broadcasts

## Основные улучшения

### 1. Разделение ответственности
- Каждый слой имеет четко определенную ответственность
- Бизнес-логика вынесена в features
- UI компоненты изолированы в widgets

### 2. Переиспользование
- API клиенты можно использовать в разных частях приложения
- Хуки для работы с данными можно переиспользовать
- Компоненты авторизации универсальны

### 3. Тестируемость
- Каждый слой можно тестировать независимо
- Моки легко создавать для API
- Бизнес-логика изолирована от UI

### 4. Типизация
- Строгая типизация на всех уровнях
- Переиспользование типов через shared слой
- Автокомплит и проверка типов

## Миграция

### Старые файлы
Следующие файлы были заменены новой FSD структурой:
- `app/broadcasts/page.tsx` - теперь использует `BroadcastListWidget`
- `app/broadcasts/[id]/page.tsx` - теперь использует `BroadcastDetailWidget`
- `app/broadcasts/new/page.tsx` - теперь использует `BroadcastFormWidget`
- `app/broadcasts/edit/[id]/page.tsx` - теперь использует `BroadcastFormWidget`

### Новые файлы
- `shared/types/broadcast.ts` - типы для broadcasts
- `shared/types/user.ts` - типы для пользователей
- `shared/api/broadcast.ts` - API клиент для broadcasts
- `shared/lib/auth.ts` - сервис авторизации
- `features/*/model/use*.ts` - хуки для работы с данными
- `widgets/*/ui/*.tsx` - UI компоненты
- `pages/*/page.tsx` - страницы

## Использование

### Создание нового broadcast
```tsx
import { useBroadcastForm } from '@/features/broadcast-form/model/useBroadcastForm';

const { saveAsDraft, sendNow, scheduleBroadcast } = useBroadcastForm();
```

### Получение списка broadcasts
```tsx
import { useBroadcastList } from '@/features/broadcast-list/model/useBroadcastList';

const { broadcasts, isLoading, error, deleteBroadcast } = useBroadcastList();
```

### Авторизация
```tsx
import { useAuth } from '@/features/auth/model/useAuth';

const { user, isAuthenticated, canAccessBroadcasts } = useAuth();
```

## Тестирование

Все новые хуки покрыты тестами:
- `features/broadcast-list/model/__tests__/useBroadcastList.test.ts`
- `features/auth/model/__tests__/useAuth.test.ts`

Запуск тестов:
```bash
npm test
```

## Преимущества FSD

1. **Масштабируемость** - легко добавлять новые фичи
2. **Переиспользование** - компоненты и логика переиспользуются
3. **Тестируемость** - каждый слой тестируется независимо
4. **Читаемость** - четкая структура и разделение ответственности
5. **Типизация** - строгая типизация на всех уровнях

## Следующие шаги

1. Добавить больше тестов для остальных features
2. Создать Storybook для UI компонентов
3. Добавить E2E тесты для критических путей
4. Оптимизировать производительность с помощью React.memo и useMemo
