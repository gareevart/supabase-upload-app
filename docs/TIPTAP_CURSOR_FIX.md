# TipTap Editor Cursor Jumping Fix

## Проблема

При редактировании текста в редакторе TipTap курсор перепрыгивал в конец текста после ввода каждого символа. Это делало невозможным редактирование текста в середине предложения.

## Причина

Проблема возникала из-за неправильной логики обновления контента в компоненте `TipTapEditor.tsx`. 

### Механизм проблемы:

1. Пользователь вводит символ в редакторе
2. Срабатывает обработчик `onUpdate` в редакторе TipTap
3. `onUpdate` вызывает `onChange`, передавая новый контент родительскому компоненту
4. Родительский компонент обновляет state с новым контентом
5. React выполняет повторный рендер компонента `TipTapEditor`
6. `useEffect`, зависящий от `content`, видит изменение и вызывает `editor.commands.setContent()`
7. Вызов `setContent()` сбрасывает позицию курсора в конец документа

## Решение

Добавлен флаг `isInternalUpdate` для отслеживания обновлений, которые произошли внутри самого редактора, и предотвращения вызова `setContent()` для них.

### Изменения в коде:

```typescript
// Добавлен новый ref для отслеживания внутренних обновлений
const isInternalUpdate = React.useRef<boolean>(false);

const editor = useEditor({
  // ...
  onUpdate: React.useCallback(({ editor }: { editor: any }) => {
    const newContent = JSON.stringify(editor.getJSON());
    if (newContent !== lastContentString.current) {
      lastContentString.current = newContent;
      // Устанавливаем флаг перед вызовом onChange
      isInternalUpdate.current = true;
      onChange(newContent);
    }
  }, [onChange]),
  // ...
});

React.useEffect(() => {
  if (editor && content) {
    try {
      const normalizedContent = normalizeTipTapContent(content);

      // Проверяем, что изменение не пришло от самого редактора
      if (normalizedContent !== previousNormalizedContent.current && !isInternalUpdate.current) {
        previousNormalizedContent.current = normalizedContent;
        const parsedContent = JSON.parse(normalizedContent);
        editor.commands.setContent(parsedContent, false);
      }
      
      // Сбрасываем флаг после проверки
      isInternalUpdate.current = false;
    } catch (e) {
      console.error('Error setting editor content:', e);
    }
  }
}, [editor, content]);
```

## Результат

После исправления:
- Курсор остается на месте при вводе текста
- Редактирование текста в середине предложения работает корректно
- Внешние обновления контента (например, загрузка сохраненного поста) продолжают работать

## Файлы изменены

- `/app/components/blog/TipTapEditor.tsx`

## Дата исправления

1 октября 2025

