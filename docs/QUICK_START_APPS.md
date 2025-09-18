# Быстрый старт: Создание TypeScript приложений

## 🚀 Как начать

1. **Перейдите на страницу профиля**: `/profile`
2. **Нажмите "Создать приложение"**
3. **Заполните основную информацию**:
   - Название приложения
   - Описание (опционально)
   - Загрузите иконку 512x512px (опционально)
   - Выберите приватность (публичное/приватное)

## 💻 Написание кода

### Базовый пример
```typescript
// Простое приветствие
const app = document.getElementById('root');
if (app) {
  app.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h1>Привет, мир!</h1>
      <p>Это мое первое TypeScript приложение</p>
    </div>
  `;
}
```

### Интерактивный пример
```typescript
// Счетчик кликов
let count = 0;

function updateCounter() {
  const counter = document.getElementById('counter');
  if (counter) {
    counter.textContent = count.toString();
  }
}

function increment() {
  count++;
  updateCounter();
  console.log(`Счетчик: ${count}`);
}

const app = document.getElementById('root');
if (app) {
  app.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h1>Счетчик: <span id="counter">0</span></h1>
      <button onclick="increment()" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      ">+1</button>
    </div>
  `;
}
```

## 🎨 Стилизация

### HTML шаблон
```html
<div id="root"></div>
<div id="sidebar">
  <h3>Боковая панель</h3>
</div>
```

### CSS стили
```css
body {
  font-family: 'Arial', sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

#root {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

#sidebar {
  position: fixed;
  right: 20px;
  top: 20px;
  background: rgba(255,255,255,0.9);
  padding: 15px;
  border-radius: 8px;
}
```

## 🤖 Использование AI ассистента

1. **Откройте вкладку "AI Ассистент"**
2. **Опишите желаемую функциональность**:
   - "Создай игру в крестики-нолики"
   - "Сделай калькулятор с кнопками"
   - "Создай список дел с возможностью добавления и удаления"
3. **Нажмите "Сгенерировать код"**
4. **Код автоматически вставится в редактор**

## 🔧 Тестирование

1. **Используйте предварительный просмотр** справа от редактора
2. **Нажмите "Запустить"** для выполнения кода
3. **Проверьте консоль** для отладочной информации
4. **Используйте "Перезапустить"** для сброса состояния

## 📤 Публикация

1. **Включите "Публичное приложение"** в настройках
2. **Сохраните приложение**
3. **Скопируйте публичную ссылку** из списка приложений
4. **Поделитесь ссылкой** с другими пользователями

## 💡 Полезные советы

### Отладка
```typescript
// Используйте console.log для отладки
console.log('Значение переменной:', myVariable);
console.error('Ошибка:', error);
console.warn('Предупреждение:', warning);
```

### Работа с DOM
```typescript
// Безопасное получение элементов
const element = document.getElementById('myElement');
if (element) {
  element.textContent = 'Новый текст';
  element.style.color = 'red';
}

// Добавление обработчиков событий
const button = document.querySelector('button');
if (button) {
  button.addEventListener('click', () => {
    alert('Кнопка нажата!');
  });
}
```

### Типизация
```typescript
// Используйте типы для лучшей разработки
interface User {
  name: string;
  age: number;
  email: string;
}

function createUser(name: string, age: number, email: string): User {
  return { name, age, email };
}

const user = createUser('Иван', 25, 'ivan@example.com');
console.log(user);
```

## 🚫 Ограничения

- **Нет поддержки npm пакетов** - используйте только встроенные API браузера
- **Максимальный размер кода**: 50KB
- **Нет доступа к внешним API** без CORS
- **Изолированная среда** - нет доступа к основному сайту

## 🆘 Решение проблем

### Код не выполняется
- Проверьте консоль на ошибки
- Убедитесь, что используете правильный синтаксис TypeScript
- Проверьте, что элемент с id="root" существует

### Стили не применяются
- Убедитесь, что CSS код находится во вкладке "CSS"
- Проверьте правильность селекторов
- Используйте инлайн-стили для быстрого тестирования

### AI не генерирует код
- Убедитесь, что описание достаточно подробное
- Попробуйте переформулировать запрос
- Проверьте подключение к интернету

## 📚 Примеры проектов

### Простая игра
```typescript
// Угадай число
const randomNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;

function checkGuess() {
  const input = document.getElementById('guess') as HTMLInputElement;
  const result = document.getElementById('result');
  
  if (!input || !result) return;
  
  const guess = parseInt(input.value);
  attempts++;
  
  if (guess === randomNumber) {
    result.textContent = `Поздравляю! Вы угадали за ${attempts} попыток!`;
    result.style.color = 'green';
  } else if (guess < randomNumber) {
    result.textContent = 'Больше!';
    result.style.color = 'orange';
  } else {
    result.textContent = 'Меньше!';
    result.style.color = 'orange';
  }
  
  input.value = '';
}

const app = document.getElementById('root');
if (app) {
  app.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h1>Угадай число от 1 до 100</h1>
      <input type="number" id="guess" placeholder="Введите число">
      <button onclick="checkGuess()">Проверить</button>
      <p id="result"></p>
    </div>
  `;
}
```

Удачи в создании ваших TypeScript приложений! 🎉
