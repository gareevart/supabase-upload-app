# Диагностика анализа изображений

## Как диагностировать проблему

Теперь в код добавлено детальное логирование. Чтобы понять, где именно происходит проблема:

### 1. Откройте терминал где запущен `npm run dev`

### 2. Отправьте изображение в чат

### 3. Проверьте логи в следующем порядке:

#### Шаг 1: Vision API ответ
```
Vision API response received
Extracted text: [текст из изображения]
Classification: [классификация или пусто]
Final analysis result: {
  extractedText: "...",
  imageClassification: "...",
  fullDescription: "...",
  success: true
}
```

**Что проверить:**
- ✅ `extractedText` должен содержать текст с изображения
- ✅ `fullDescription` НЕ должен быть пустым
- ⚠️ `imageClassification` может быть пустым (это ок)

#### Шаг 2: Анализ на клиенте
```
Image analysis response: {
  success: true,
  hasDescription: true,
  descriptionLength: 123,
  description: "Текст на изображении: ..."
}
```

**Что проверить:**
- ✅ `success: true`
- ✅ `hasDescription: true`
- ✅ `descriptionLength > 0`

**Если `hasDescription: false`:**
- Проблема на сервере - описание не формируется
- Проверьте логи выше (Step 1)

#### Шаг 3: Обработка файлов
```
File processing result: {
  attachmentsCount: 1,
  descriptionsCount: 1,
  validDescriptionsCount: 1,
  validDescriptions: ["[Изображение: ...]\nТекст на изображении: ..."]
}
```

**Что проверить:**
- ✅ `validDescriptionsCount` должен быть >= 1
- ✅ `validDescriptions` должен содержать описание изображения

**Если `validDescriptionsCount: 0`:**
- Описание не прошло фильтрацию
- Возможно, описание пустое или undefined

#### Шаг 4: Финальный контент
```
Enriched content for YandexGPT: {
  originalContent: "",
  enrichedContent: "[Изображение: test.png]\nТекст на изображении: ...",
  enrichedContentLength: 123,
  isEmpty: false
}
```

**Что проверить:**
- ✅ `enrichedContentLength > 0`
- ✅ `isEmpty: false`

**Если `isEmpty: true` или `enrichedContentLength: 0`:**
- Это причина ошибки "empty message text"
- Проверьте предыдущие шаги

## Типичные проблемы и решения

### Проблема 1: `fullDescription` пустой
**Симптом:**
```
Final analysis result: {
  fullDescription: "",
  success: true
}
```

**Причина:** Vision API не вернул ни текст, ни классификацию

**Решение:**
- Проверьте формат изображения
- Убедитесь, что изображение содержит текст или распознаваемые объекты
- Попробуйте другое изображение

### Проблема 2: `hasDescription: false`
**Симптом:**
```
Image analysis response: {
  success: true,
  hasDescription: false
}
```

**Причина:** `description` undefined или пустая строка

**Решение:**
- Проверьте логи API endpoint (Final analysis result)
- Убедитесь, что API возвращает `description`

### Проблема 3: `validDescriptionsCount: 0`
**Симптом:**
```
File processing result: {
  validDescriptionsCount: 0,
  validDescriptions: []
}
```

**Причина:** Все описания undefined/null/empty

**Решение:**
- Проверьте предыдущий шаг (Image analysis response)
- Возможно, `analysis.description` не проходит проверку

### Проблема 4: `isEmpty: true`
**Симптом:**
```
Enriched content for YandexGPT: {
  isEmpty: true
}
```

**Причина:** После всех обработок контент пустой

**Решение:**
- Это баг в логике формирования `enrichedContent`
- Проверьте, что fallback работает правильно

## Примеры правильных логов

### Успешный случай:
```
Vision API response received
Extracted text: Деплою будущее the Future Запускаем будущее сегодня Deploy the Future
Classification error (non-critical): Unsupported classification model
Final analysis result: {
  extractedText: "Деплою будущее the Future...",
  imageClassification: "",
  fullDescription: "Текст на изображении: \"Деплою будущее the Future...\"",
  success: true
}

Image analysis response: {
  success: true,
  hasDescription: true,
  descriptionLength: 98,
  description: "Текст на изображении: \"Деплою будущее the Future...\""
}

File processing result: {
  attachmentsCount: 1,
  descriptionsCount: 1,
  validDescriptionsCount: 1,
  validDescriptions: ["[Изображение: screenshot.png]\nТекст на изображении: ..."]
}

Enriched content for YandexGPT: {
  originalContent: "",
  enrichedContent: "[Изображение: screenshot.png]\nТекст на изображении: \"Деплою будущее the Future...\"",
  enrichedContentLength: 150,
  isEmpty: false
}
```

## Следующие шаги

После анализа логов:

1. **Если все шаги OK, но ошибка все равно есть:**
   - Проверьте логи в `app/api/generate-text/route.ts`
   - Возможно, проблема в формировании `messages` для YandexGPT API

2. **Если один из шагов FAIL:**
   - Сообщите номер шага где произошла ошибка
   - Приложите полные логи этого шага
   - Это поможет точно определить причину

3. **Для дополнительной диагностики:**
   - Откройте DevTools (F12)
   - Перейдите в Network tab
   - Посмотрите Request Payload для `/api/generate-text`
   - Проверьте, что `messages` содержат непустой текст

