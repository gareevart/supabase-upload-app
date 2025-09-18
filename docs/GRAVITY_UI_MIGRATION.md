# Миграция на Gravity UI

## 🎨 Обзор

Страница открытого приложения (`/app/apps/[id]/page.tsx`) была полностью переписана с использованием компонентов **Gravity UI** от Yandex вместо shadcn/ui компонентов.

## 🔄 Изменения

### Замененные компоненты

| Было (shadcn/ui) | Стало (Gravity UI) | Описание |
|------------------|-------------------|----------|
| `Button` | `Button` | Кнопки с view и size пропами |
| `Card` | `Card` | Карточки с Box для контента |
| `Badge` | `Label` | Метки с темами |
| `Skeleton` | `Skeleton` | Скелетоны загрузки |
| `Alert` | `Alert` | Уведомления |
| `div` + CSS | `Box`, `Flex` | Layout компоненты |
| `h1`, `p` | `Heading`, `Text` | Типографика |
| Lucide Icons | `@gravity-ui/icons` | Иконки |

### Новая структура

#### 1. Импорты
```tsx
import { 
  Button, 
  Card, 
  Text, 
  Heading, 
  Skeleton, 
  Label,
  Icon,
  Flex,
  Box,
  Loader,
  Alert
} from '@gravity-ui/uikit';
import { 
  ArrowLeft, 
  Play, 
  Code, 
  Calendar, 
  Globe,
  Pause
} from '@gravity-ui/icons';
```

#### 2. Layout с Flex и Box
```tsx
<Box style={{ minHeight: '100vh', padding: '24px' }}>
  <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
    <Flex direction="column" gap={6}>
      {/* Контент */}
    </Flex>
  </Box>
</Box>
```

#### 3. Кнопки
```tsx
// Было
<Button variant="outline" size="sm">
  <ArrowLeft className="w-4 h-4 mr-2" />
  Назад
</Button>

// Стало
<Button view="outlined" size="l">
  <Icon data={ArrowLeft} size={16} />
  Назад
</Button>
```

#### 4. Типографика
```tsx
// Было
<h1 className="text-2xl font-bold">{app.name}</h1>
<p className="text-gray-600">{app.description}</p>

// Стало
<Heading size="xl">{app.name}</Heading>
<Text color="secondary">{app.description}</Text>
```

#### 5. Иконки
```tsx
// Было
<Code className="w-6 h-6 text-white" />

// Стало
<Icon data={Code} size={24} style={{ color: 'white' }} />
```

#### 6. Метки (Labels)
```tsx
// Было
<Badge variant="secondary">
  <Globe className="w-3 h-3 mr-1" />
  Публичное приложение
</Badge>

// Стало
<Label theme="info" size="s">
  <Icon data={Globe} size={12} />
  Публичное приложение
</Label>
```

## 🎯 Ключевые особенности

### 1. Система дизайна
- **Консистентность**: Единый стиль всех компонентов
- **Темизация**: Автоматическая поддержка светлой/темной темы
- **Доступность**: Встроенная поддержка a11y

### 2. Layout система
- **Flex**: Flexbox layout с gap, direction, alignItems
- **Box**: Контейнеры с padding, margin, styling
- **Responsive**: Адаптивность из коробки

### 3. Типографика
- **Heading**: size="xs" | "s" | "m" | "l" | "xl" | "xxl"
- **Text**: size="xs" | "s" | "m" | "l", color="primary" | "secondary"
- **Variant**: subheader-1, subheader-2, body-1, body-2

### 4. Кнопки
- **View**: "normal" | "action" | "outlined" | "flat"
- **Size**: "xs" | "s" | "m" | "l" | "xl"
- **Loading**: Встроенные состояния загрузки

## 🛠️ Настройка

### 1. Провайдер тем
```tsx
// app/components/GravityUIProvider.tsx
'use client';

import React from 'react';
import { ThemeProvider } from '@gravity-ui/uikit';

export default function GravityUIProvider({ children }) {
  return (
    <ThemeProvider theme="light">
      {children}
    </ThemeProvider>
  );
}
```

### 2. Подключение в Layout
```tsx
// app/layout.tsx
import GravityUIProvider from './components/GravityUIProvider';
import '@gravity-ui/uikit/styles/styles.css';

// В JSX
<GravityUIProvider>
  <ThemeWrapper theme={theme}>
    {children}
  </ThemeWrapper>
</GravityUIProvider>
```

## 🎨 Стилизация

### CSS переменные
Gravity UI использует CSS переменные для темизации:
```css
/* Цвета */
--g-color-base-background
--g-color-text-primary
--g-color-text-secondary
--g-color-line-generic

/* Размеры */
--g-spacing-1 /* 4px */
--g-spacing-2 /* 8px */
--g-spacing-3 /* 12px */
```

### Кастомные стили
```tsx
<Box
  style={{
    backgroundColor: 'var(--g-color-base-background)',
    border: '1px solid var(--g-color-line-generic)',
    borderRadius: '8px',
    padding: '16px'
  }}
>
  Контент
</Box>
```

## 📱 Адаптивность

### Responsive Flex
```tsx
<Flex 
  direction={{ base: 'column', md: 'row' }}
  gap={{ base: 2, md: 4 }}
  alignItems="center"
>
  <Box style={{ flex: 1 }}>Контент</Box>
</Flex>
```

### Условная отрисовка
```tsx
{isRunning && (
  <Card>
    <Box style={{ padding: '20px' }}>
      <MultiLanguageRunner />
    </Box>
  </Card>
)}
```

## 🔧 Компоненты в деталях

### Button
```tsx
<Button
  view="action"        // Стиль кнопки
  size="l"            // Размер
  loading={isLoading} // Состояние загрузки
  disabled={disabled} // Отключена
  onClick={handler}   // Обработчик
>
  <Icon data={Play} size={16} />
  Текст кнопки
</Button>
```

### Card
```tsx
<Card>
  <Box style={{ padding: '20px' }}>
    <Heading size="m">Заголовок</Heading>
    <Text color="secondary">Описание</Text>
  </Box>
</Card>
```

### Label
```tsx
<Label 
  theme="info"     // info, success, warning, danger, normal
  size="s"         // xs, s, m
>
  <Icon data={Globe} size={12} />
  Текст метки
</Label>
```

## 🚀 Преимущества

### 1. Производительность
- **Tree shaking**: Импорт только используемых компонентов
- **CSS-in-JS**: Оптимизированные стили
- **Lazy loading**: Компоненты загружаются по требованию

### 2. Разработка
- **TypeScript**: Полная типизация из коробки
- **Storybook**: Документация компонентов
- **Тестирование**: Встроенные тесты

### 3. Дизайн
- **Консистентность**: Единая система дизайна
- **Темы**: Автоматическая поддержка тем
- **Иконки**: Большая библиотека иконок

## 🔮 Дальнейшие шаги

### Миграция других страниц
1. **Главная страница** - перевести на Gravity UI
2. **Редактор приложений** - обновить интерфейс
3. **Список приложений** - унифицировать дизайн
4. **Профиль пользователя** - обновить формы

### Улучшения
1. **Темная тема** - настроить переключение тем
2. **Анимации** - добавить плавные переходы
3. **Мобильная версия** - оптимизировать для мобильных
4. **Компоненты** - создать кастомные компоненты

---

Gravity UI предоставляет мощную и гибкую систему компонентов для создания современных интерфейсов с отличным UX! 🎉
