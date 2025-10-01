# Оптимизация LCP для изображений

## Проблема

Next.js выдает warning в консоли:
```
Image with src "..." was detected as the Largest Contentful Paint (LCP). 
Please add the "priority" property if this image is above the fold.
```

## Что такое LCP?

**LCP (Largest Contentful Paint)** - одна из ключевых метрик Core Web Vitals, которая измеряет время загрузки самого большого видимого элемента на странице.

- **Хорошо**: < 2.5 секунд
- **Требует улучшения**: 2.5 - 4 секунды  
- **Плохо**: > 4 секунд

## Решение

### 1. Определение приоритетных изображений

Нужно добавить свойство `priority` для изображений, которые видны "above the fold" (в видимой части экрана без прокрутки).

### 2. Реализация в PostList

```typescript
{posts.map((post, index) => {
  // Приоритетная загрузка для первых изображений (above the fold)
  // В grid view - первые 4 изображения, в list view - первые 2
  const isPriority = gridView ? index < 4 : index < 2;
  
  return (
    <Image
      src={post.featured_image}
      alt={post.title}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
      priority={isPriority}              // ✅ Добавлен priority
      loading={isPriority ? undefined : "lazy"}  // ✅ Условный lazy loading
    />
  );
})}
```

### 3. Логика приоритезации

**Grid View (сетка 2 колонки)**:
- Первые 4 изображения → `priority={true}` (первые 2 строки)
- Остальные → `loading="lazy"`

**List View (список)**:
- Первые 2 изображения → `priority={true}` (видны без прокрутки)
- Остальные → `loading="lazy"`

**Mobile View**:
- Адаптируется автоматически
- 1 колонка, поэтому приоритет для первых 2 изображений

## Важные моменты

### ❌ Не делайте так:
```typescript
// Конфликтующие настройки
<Image
  priority={false}  // ❌
  loading="lazy"    // ❌
/>
```

### ✅ Правильно:
```typescript
// Приоритетное изображение
<Image
  priority={true}
  // loading не указываем
/>

// Или lazy loading
<Image
  // priority не указываем
  loading="lazy"
/>

// Или условно
<Image
  priority={isPriority}
  loading={isPriority ? undefined : "lazy"}
/>
```

## Преимущества

✅ **Улучшение LCP метрики**
- Приоритетные изображения загружаются быстрее
- Браузер знает, какие ресурсы важнее

✅ **Лучшая производительность**
- Видимые изображения загружаются сразу
- Невидимые загружаются по требованию

✅ **Улучшение SEO**
- Core Web Vitals влияют на ранжирование в Google
- Лучшие метрики = выше позиции в поиске

✅ **Лучший UX**
- Страница визуально загружается быстрее
- Нет "пустых" блоков вместо изображений

## Проверка результатов

### 1. Chrome DevTools
1. Откройте DevTools (F12)
2. Вкладка **Performance**
3. Запись загрузки страницы
4. Проверьте LCP метрику

### 2. Lighthouse
1. DevTools → **Lighthouse**
2. Запустите аудит
3. Проверьте **Performance** → **Largest Contentful Paint**

### 3. PageSpeed Insights
- Откройте [PageSpeed Insights](https://pagespeed.web.dev/)
- Введите URL вашей страницы
- Проверьте LCP в разделе Core Web Vitals

## Дополнительные оптимизации

### Sizes атрибут
```typescript
<Image
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```
Помогает браузеру выбрать оптимальный размер изображения.

### Placeholder
```typescript
<Image
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```
Показывает размытый placeholder во время загрузки.

### Формат изображений
- Используйте **WebP** или **AVIF** вместо JPG/PNG
- Next.js автоматически оптимизирует изображения

## Мониторинг

Регулярно проверяйте метрики:
- **LCP** < 2.5s
- **FID** < 100ms
- **CLS** < 0.1

## Связанные документы

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Core Web Vitals](https://web.dev/vitals/)
- [BLOG_CACHING_FSD.md](./BLOG_CACHING_FSD.md)

---

**Дата создания**: 1 октября 2025

