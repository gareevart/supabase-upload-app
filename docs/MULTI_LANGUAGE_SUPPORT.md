# Поддержка множественных языков программирования

## 🚀 Обзор

Система теперь поддерживает создание и выполнение приложений на трех языках программирования:
- **TypeScript** - статически типизированный JavaScript
- **JavaScript** - классический веб-язык
- **Python** - с поддержкой NumPy и других библиотек через Pyodide

## 🏗️ Архитектура

### 1. Обновления базы данных

```sql
-- Добавлено поле language в таблицу user_apps
ALTER TABLE user_apps 
ADD COLUMN language VARCHAR(20) DEFAULT 'typescript' 
CHECK (language IN ('typescript', 'python', 'javascript'));
```

### 2. Компоненты системы

#### MultiLanguageRunner
Универсальный компонент для выполнения кода на разных языках:
- Автоматически выбирает подходящий runner
- Для Python использует PythonRunner с Pyodide
- Для TypeScript/JavaScript использует существующий AppRunner

#### PythonRunner
Специализированный компонент для Python:
- Использует Pyodide для выполнения Python в браузере
- Поддерживает NumPy, Matplotlib
- Предоставляет API для работы с DOM
- Показывает прогресс загрузки окружения

### 3. Обновленный интерфейс

#### Селектор языка
```tsx
<Select value={formData.language} onValueChange={handleLanguageChange}>
  <SelectItem value="typescript">TypeScript</SelectItem>
  <SelectItem value="javascript">JavaScript</SelectItem>
  <SelectItem value="python">🐍 Python</SelectItem>
</Select>
```

#### Динамические шаблоны кода
Система автоматически подставляет подходящий код при смене языка.

## 🐍 Python в браузере

### Возможности Pyodide

1. **Полная поддержка Python 3.11**
2. **Научные библиотеки**: NumPy, Matplotlib, SciPy
3. **Интеграция с DOM**: специальные функции для работы с HTML
4. **Консольный вывод**: перенаправление print() в браузер

### API для работы с DOM

```python
# Получение элемента
element = get_element('element-id')

# Установка HTML содержимого
set_html('element-id', '<h1>Hello World</h1>')

# Создание нового элемента
button = create_element('button', 'Click me', {'onclick': 'alert("Hi")'})

# Добавление к родителю
append_to('parent-id', button)
```

### Пример Python приложения

```python
import numpy as np

# Генерируем данные
data = np.random.normal(100, 15, 1000)

# Создаем интерфейс
root = get_element('root')
if root:
    content = f"""
    <div class="stats">
        <h1>Статистика данных</h1>
        <p>Среднее: {np.mean(data):.2f}</p>
        <p>Медиана: {np.median(data):.2f}</p>
        <p>Стд. отклонение: {np.std(data):.2f}</p>
    </div>
    """
    set_html('root', content)

print("Python приложение готово!")
```

## 📝 Шаблоны приложений

### Новые Python шаблоны

1. **Анализ данных** - демонстрация NumPy для статистики
2. **Игра "Угадай число"** - интерактивная игра с состоянием
3. **Научный калькулятор** (планируется)

### Структура шаблона

```typescript
interface AppTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  language?: 'typescript' | 'python' | 'javascript';
  typescript?: string;  // Код для TypeScript
  python?: string;      // Код для Python
  javascript?: string;  // Код для JavaScript
  html: string;
  css: string;
}
```

## 🔧 Использование

### Создание нового приложения

1. Выберите язык программирования в селекторе
2. Код автоматически обновится под выбранный язык
3. Используйте шаблоны для быстрого старта
4. Нажмите "Запустить" для тестирования

### Переключение языков

При смене языка:
- Код заменяется на шаблон по умолчанию для нового языка
- Интерфейс редактора обновляется (подсветка синтаксиса)
- Runner автоматически выбирает подходящий движок

## ⚡ Производительность

### Python (Pyodide)
- **Первая загрузка**: ~10-30 секунд (загрузка окружения)
- **Последующие запуски**: мгновенно
- **Размер**: ~50MB (кешируется браузером)
- **Поддерживаемые пакеты**: 100+ научных библиотек

### TypeScript/JavaScript
- **Загрузка**: мгновенно
- **Выполнение**: нативная скорость браузера
- **Размер**: минимальный

## 🛠️ Разработка

### Добавление нового языка

1. Обновить enum в `lib/types.ts`
2. Создать специализированный Runner (если нужен)
3. Обновить MultiLanguageRunner
4. Добавить в селектор языков
5. Создать шаблоны для нового языка

### Добавление Python библиотек

```javascript
// В PythonRunner.tsx
await pyodide.loadPackage(['numpy', 'matplotlib', 'новая-библиотека']);
```

## 🐛 Отладка

### Python ошибки
- Ошибки отображаются в консоли браузера
- Traceback доступен в DevTools
- Используйте `print()` для отладочного вывода

### Общие проблемы

1. **Pyodide не загружается**
   - Проверьте интернет соединение
   - Очистите кеш браузера

2. **Python код не выполняется**
   - Проверьте синтаксис Python
   - Убедитесь что используете поддерживаемые библиотеки

3. **DOM функции не работают**
   - Убедитесь что элементы существуют в HTML
   - Используйте правильные ID элементов

## 📚 Примеры использования

### Научные вычисления
```python
import numpy as np
import matplotlib.pyplot as plt

# Генерация данных
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Статистика
print(f"Среднее: {np.mean(y)}")
print(f"Максимум: {np.max(y)}")
```

### Интерактивные приложения
```python
def handle_click():
    result = get_element('result')
    result.innerHTML = "Кнопка нажата!"

# Создание кнопки
button = create_element('button', 'Нажми меня')
button.onclick = handle_click
append_to('root', button)
```

### Обработка данных
```python
import numpy as np

# Загрузка данных
data = np.array([1, 2, 3, 4, 5])

# Обработка
processed = np.power(data, 2)
result = np.sum(processed)

# Вывод результата
set_html('output', f'Результат: {result}')
```

## 🔮 Планы развития

1. **Больше языков**: Rust (WASM), Go (WASM)
2. **Дополнительные Python пакеты**: Pandas, Scikit-learn
3. **Визуализация**: Интеграция Matplotlib в браузер
4. **Совместная работа**: Шаринг кода между языками
5. **Производительность**: Оптимизация загрузки Pyodide

---

Эта система открывает новые возможности для создания образовательных, научных и интерактивных приложений прямо в браузере!
