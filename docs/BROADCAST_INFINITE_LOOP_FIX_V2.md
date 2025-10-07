# Broadcast Infinite Loop Fix V2

## Problem

После исправления фильтра статуса рассылок возникла проблема с зацикливанием (infinite loop) при получении списка рассылок. Приложение постоянно отправляло HTTP запросы к API, что приводило к:

- Бесконечным запросам к `/api/broadcasts`
- Высокой нагрузке на сервер
- Плохой производительности
- Возможным ошибкам rate limiting

## Root Cause

Проблема была в неправильной настройке зависимостей в React хуках в файле `features/broadcast-list/model/useBroadcastList.ts`:

```typescript
// Проблемный код
const fetchBroadcasts = useCallback(async (currentFilters: BroadcastFilters) => {
  // ... использует currentFilters как параметр
}, [toast]); // Не зависит от filters

useEffect(() => {
  fetchBroadcasts(filters);
}, [filters, fetchBroadcasts]); // Зависит от filters И fetchBroadcasts
```

**Цепочка зацикливания:**
1. `useEffect` зависит от `filters` и `fetchBroadcasts`
2. При изменении `filters` → `useEffect` запускается
3. `useEffect` вызывает `fetchBroadcasts(filters)`
4. Но `fetchBroadcasts` не зависит от `filters` в `useCallback`
5. Это создает несоответствие между зависимостями

## Solution

### 1. Вернули `filters` в зависимости `useCallback`

```typescript
// До исправления
const fetchBroadcasts = useCallback(async (currentFilters: BroadcastFilters) => {
  // использует currentFilters как параметр
}, [toast]);

// После исправления
const fetchBroadcasts = useCallback(async () => {
  // использует filters из замыкания
  const response = await BroadcastApi.getBroadcasts(filters);
}, [filters, toast]);
```

**Преимущества:**
- `fetchBroadcasts` теперь зависит от `filters`
- При изменении `filters` создается новая функция `fetchBroadcasts`
- `useEffect` правильно реагирует на изменения

### 2. Упростили `useEffect`

```typescript
// До исправления
useEffect(() => {
  fetchBroadcasts(filters);
}, [filters, fetchBroadcasts]);

// После исправления
useEffect(() => {
  fetchBroadcasts();
}, [fetchBroadcasts]);
```

**Преимущества:**
- Убрали дублирующую зависимость `filters`
- `useEffect` зависит только от `fetchBroadcasts`
- Когда `filters` изменяется → `fetchBroadcasts` пересоздается → `useEffect` запускается

### 3. Упростили `refresh` функцию

```typescript
// До исправления
const refresh = useCallback(() => {
  fetchBroadcasts(filters);
}, [fetchBroadcasts, filters]);

// После исправления
const refresh = useCallback(() => {
  fetchBroadcasts();
}, [fetchBroadcasts]);
```

## Files Changed

- `features/broadcast-list/model/useBroadcastList.ts` - исправлены зависимости в React хуках

## Testing

1. Откройте страницу `/broadcasts`
2. Проверьте, что список рассылок загружается один раз
3. Переключите фильтр статуса (Черновики, Запланированные, Отправленные)
4. Проверьте, что список обновляется один раз при каждом изменении фильтра
5. Проверьте консоль браузера - не должно быть бесконечных запросов

## Expected Behavior

- При загрузке страницы выполняется один запрос к API
- При изменении фильтра выполняется один запрос к API
- Нет бесконечных запросов
- Нет зацикливания

## Related Issues

- Исправление фильтра статуса рассылок (BROADCAST_FILTER_FIX.md)
- Исправление аутентификации через cookies (BROADCASTS_AUTH_COOKIE_FIX.md)
