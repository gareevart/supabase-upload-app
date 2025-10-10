# Миграция на SegmentedRadioGroup в модальном окне обложки

## Описание изменения

В модальном окне для выбора изображения обложки поста заменены стандартные табы на компонент `SegmentedRadioGroup` из Gravity UI для переключения между режимами "Генерация" и "Галерея".

## Причина изменения

1. **Соответствие дизайн-системе**: Использование компонента `SegmentedRadioGroup` из Gravity UI обеспечивает единообразие интерфейса по всему приложению
2. **Лучший UX**: `SegmentedRadioGroup` предоставляет более интуитивный и визуально привлекательный способ переключения между режимами
3. **Консистентность**: Тот же компонент уже используется в других частях приложения (например, в `BroadcastListWidget`)

## Технические детали

### До изменения
Использовались кастомные компоненты табов из `@/app/components/ui/tabs`:
```tsx
<Tabs defaultValue="prompt" value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="prompt">Генерация</TabsTrigger>
    <TabsTrigger value="gallery">Галерея</TabsTrigger>
  </TabsList>
  <TabsContent value="prompt">...</TabsContent>
  <TabsContent value="gallery">...</TabsContent>
</Tabs>
```

### После изменения
Используется `SegmentedRadioGroup` из `@gravity-ui/uikit`:
```tsx
<SegmentedRadioGroup
  size="l"
  value={activeTab}
  onChange={handleTabChange}
  options={[
    { value: 'prompt', content: 'Генерация' },
    { value: 'gallery', content: 'Галерея' },
  ]}
/>

{activeTab === 'prompt' && <div>...</div>}
{activeTab === 'gallery' && <div>...</div>}
```

## Изменения в коде

### Файл: `app/components/blog/editor/FeaturedImageSection.tsx`

#### Импорты
**До:**
```tsx
import { Button, Text, TextArea, Modal, Icon } from '@gravity-ui/uikit';
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/app/components/ui/tabs";
```

**После:**
```tsx
import { Button, Text, TextArea, Modal, Icon, SegmentedRadioGroup } from '@gravity-ui/uikit';
```

#### Обработчик изменений
Добавлен новый обработчик для работы с `SegmentedRadioGroup`:
```tsx
const handleTabChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setActiveTab(event.target.value);
};
```

#### Структура компонента
Вместо структуры `Tabs` -> `TabsContent` используется условный рендеринг:
```tsx
<SegmentedRadioGroup
  size="l"
  value={activeTab}
  onChange={handleTabChange}
  options={[
    { value: 'prompt', content: 'Генерация' },
    { value: 'gallery', content: 'Галерея' },
  ]}
/>

{activeTab === 'prompt' && (
  <div className="space-y-4 mt-4">
    {/* Содержимое для генерации */}
  </div>
)}

{activeTab === 'gallery' && (
  <div className="mt-4">
    {/* Содержимое для галереи */}
  </div>
)}
```

## Преимущества нового подхода

1. ✅ **Единая дизайн-система**: Использование компонентов исключительно из Gravity UI
2. ✅ **Лучшая производительность**: Меньше зависимостей от кастомных компонентов
3. ✅ **Улучшенная доступность**: Gravity UI компоненты оптимизированы для accessibility
4. ✅ **Простота поддержки**: Код более понятен и легче в поддержке
5. ✅ **Консистентность**: Одинаковый стиль переключателей по всему приложению

## Файлы, затронутые изменениями

- `app/components/blog/editor/FeaturedImageSection.tsx` - основной компонент с модальным окном

## Совместимость

- ✅ Обратная совместимость сохранена
- ✅ API компонента не изменился
- ✅ Функциональность работает идентично
- ✅ Проект успешно собирается без ошибок

## Тестирование

Для проверки изменений:
1. Открыть страницу создания/редактирования поста
2. Нажать на кнопку "Generate" в секции обложки
3. Убедиться, что `SegmentedRadioGroup` корректно переключается между "Генерация" и "Галерея"
4. Проверить, что функциональность генерации и выбора из галереи работает корректно

## Дополнительные улучшения

В будущем можно рассмотреть:
- Добавление анимаций при переключении между режимами
- Использование `SegmentedRadioGroup` в других местах приложения, где используются табы
- Полный отказ от кастомных компонентов табов в пользу Gravity UI компонентов

