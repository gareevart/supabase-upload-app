# Broadcast Infinite Loop Fix

## Problem

После исправления фильтра статуса рассылок возникла проблема с зацикливанием (infinite loop) при получении списка рассылок. Приложение постоянно отправляло HTTP запросы к API, что приводило к:

- Бесконечным запросам к `/api/broadcasts`
- Высокой нагрузке на сервер
- Плохой производительности
- Возможным ошибкам rate limiting

## Root Cause

Проблема была в неправильной настройке зависимостей в React хуках:

```typescript
// Проблемный код
const fetchBroadcasts = useCallback(async () => {
  // ... использует filters
}, [filters, toast]); // Зависит от filters

useEffect(() => {
  fetchBroadcasts();
}, [fetchBroadcasts]); // Зависит от fetchBroadcasts
```

**Цепочка зацикливания:**
1. `fetchBroadcasts` зависит от `filters`
2. `useEffect` зависит от `fetchBroadcasts`
3. При изменении `filters` → `fetchBroadcasts` пересоздается
4. При пересоздании `fetchBroadcasts` → `useEffect` перезапускается
5. `useEffect` вызывает `fetchBroadcasts` → бесконечный цикл

## Solution

### 1. Изменена сигнатура fetchBroadcasts

```typescript
// До исправления
const fetchBroadcasts = useCallback(async () => {
  // ... использует filters из замыкания
}, [filters, toast]);

// После исправления
const fetchBroadcasts = useCallback(async (currentFilters: BroadcastFilters) => {
  // ... получает filters как параметр
}, [toast]); // Только toast в зависимостях
```

### 2. Обновлены вызовы fetchBroadcasts

```typescript
// В useEffect
useEffect(() => {
  const loadBroadcasts = async () => {
    if (isMounted) {
      await fetchBroadcasts(filters); // Передаем filters как параметр
    }
  };
  loadBroadcasts();
}, [filters, fetchBroadcasts]); // Стабильные зависимости

// В refresh
const refresh = useCallback(() => {
  fetchBroadcasts(filters); // Передаем filters как параметр
}, [fetchBroadcasts, filters]);
```

## How It Works Now

1. **`fetchBroadcasts` стабильна**: Не зависит от `filters`, только от `toast`
2. **`useEffect` реагирует на изменения**: Запускается только при изменении `filters`
3. **Нет зацикливания**: `fetchBroadcasts` не пересоздается при изменении `filters`
4. **Правильная передача данных**: `filters` передается как параметр функции

## Files Changed

- **Modified**: `features/broadcast-list/model/useBroadcastList.ts`
  - Изменена сигнатура `fetchBroadcasts`
  - Обновлены зависимости в `useCallback`
  - Исправлены вызовы в `useEffect` и `refresh`

## Testing

Для проверки исправления:

1. Откройте страницу `/broadcasts`
2. Откройте Network tab в DevTools
3. Переключайте фильтры статуса
4. Убедитесь, что:
   - ✅ Запросы отправляются только при изменении фильтра
   - ✅ Нет бесконечных запросов
   - ✅ Каждый фильтр работает корректно
   - ✅ В консоли нет ошибок зацикливания

## Expected Behavior

После исправления:

- ✅ Фильтры работают без зацикливания
- ✅ HTTP запросы отправляются только при необходимости
- ✅ Производительность улучшена
- ✅ Нет ошибок в консоли
- ✅ Стабильная работа приложения

## Debug Information

Если проблемы продолжаются, проверьте:

1. **Network tab**: 
   - Количество запросов к `/api/broadcasts`
   - Временные интервалы между запросами

2. **Console**: 
   - Логи "Fetching broadcasts with filters:"
   - Ошибки React о зацикливании

3. **React DevTools**: 
   - Количество ререндеров компонента
   - Изменения в зависимостях хуков

## Related Issues

- Исправляет зацикливание при фильтрации рассылок
- Улучшает производительность приложения
- Стабилизирует работу React хуков
- Предотвращает избыточные API запросы

## Best Practices

Для предотвращения подобных проблем в будущем:

1. **Избегайте зависимостей от изменяемых значений** в `useCallback`
2. **Передавайте данные как параметры** вместо использования замыканий
3. **Используйте стабильные зависимости** в `useEffect`
4. **Тестируйте производительность** после изменений в хуках
5. **Мониторьте Network tab** при разработке

## Future Improvements

Рекомендуется:

1. Добавить debouncing для фильтров
2. Использовать React Query для кеширования
3. Добавить loading states для лучшего UX
4. Реализовать оптимистичные обновления
5. Добавить error boundaries для обработки ошибок
