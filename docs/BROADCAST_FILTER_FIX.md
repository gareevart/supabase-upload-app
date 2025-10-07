# Broadcast Status Filter Fix

## Problem

Фильтр переключения статуса рассылок на странице `/broadcasts` не работал. При выборе разных статусов (Черновики, Запланированные, Отправленные, С ошибками) список рассылок не обновлялся.

## Root Cause

Проблема была в хуке `useBroadcastList` в файле `features/broadcast-list/model/useBroadcastList.ts`:

1. **Неправильные зависимости в useEffect**: 
   ```typescript
   // Проблемный код
   useEffect(() => {
     // ... fetch logic
   }, []); // Пустой массив зависимостей
   ```

2. **Отсутствие перезагрузки при изменении фильтров**: 
   - `fetchBroadcasts` зависит от `filters` (строка 36)
   - Но `useEffect` не перезапускался при изменении фильтров
   - Результат: данные загружались только один раз при монтировании

## Solution

### 1. Исправлены зависимости useEffect

```typescript
// До исправления
useEffect(() => {
  // ... fetch logic
}, []); // Только при монтировании

// После исправления  
useEffect(() => {
  // ... fetch logic
}, [fetchBroadcasts]); // При изменении fetchBroadcasts (который зависит от filters)
```

### 2. Добавлено логирование для отладки

```typescript
const fetchBroadcasts = useCallback(async () => {
  console.log('Fetching broadcasts with filters:', filters);
  const response = await BroadcastApi.getBroadcasts(filters);
  console.log('Broadcasts response:', response);
  // ...
}, [filters, toast]);

const updateFilters = useCallback((newFilters: Partial<BroadcastFilters>) => {
  console.log('Updating filters:', newFilters);
  setFilters(prev => {
    const updated = { ...prev, ...newFilters };
    console.log('New filters state:', updated);
    return updated;
  });
}, []);
```

## How It Works

1. **Пользователь выбирает фильтр** в `SegmentedRadioGroup`
2. **Вызывается `handleStatusFilterChange`** в `BroadcastListWidget`
3. **Обновляются фильтры** через `updateFilters({ status: newStatus })`
4. **Изменяется состояние `filters`** в `useBroadcastList`
5. **Перезапускается `fetchBroadcasts`** из-за зависимости от `filters`
6. **Выполняется API запрос** с новыми фильтрами
7. **Обновляется список рассылок** с отфильтрованными данными

## Files Changed

- **Modified**: `features/broadcast-list/model/useBroadcastList.ts`
  - Исправлены зависимости в `useEffect`
  - Добавлено логирование для отладки

## Testing

Для тестирования исправлений:

1. Откройте страницу `/broadcasts`
2. Убедитесь, что загружается список всех рассылок
3. Нажмите на разные фильтры:
   - "Все" - показывает все рассылки
   - "Черновики" - показывает только черновики
   - "Запланированные" - показывает только запланированные
   - "Отправленные" - показывает только отправленные
   - "С ошибками" - показывает только с ошибками
4. Проверьте консоль браузера для отладочной информации

## Expected Behavior

После исправлений:

- ✅ Фильтр статуса должен работать корректно
- ✅ При выборе фильтра список должен обновляться
- ✅ В консоли должны появляться логи с информацией о фильтрах
- ✅ API запросы должны выполняться с правильными параметрами фильтрации

## Debug Information

Если проблемы продолжаются, проверьте:

1. **Консоль браузера**: 
   - Логи "Updating filters:" при изменении фильтра
   - Логи "Fetching broadcasts with filters:" при загрузке данных
   - Ошибки JavaScript

2. **Network tab**: 
   - HTTP запросы к `/api/broadcasts?status=...`
   - Параметры запроса должны соответствовать выбранному фильтру

3. **Консоль сервера**: 
   - Логи из API endpoint с примененными фильтрами

## Related Issues

- Исправляет проблему с фильтрацией рассылок по статусу
- Улучшает отзывчивость интерфейса
- Добавляет отладочную информацию для диагностики

## Future Improvements

Рекомендуется:

1. Добавить фильтрацию по дате создания
2. Добавить поиск по теме рассылки
3. Добавить сортировку по разным полям
4. Добавить пагинацию для больших списков
5. Добавить сохранение состояния фильтров в URL
