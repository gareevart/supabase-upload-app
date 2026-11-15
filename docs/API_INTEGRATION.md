# 🔑 API интеграция для приложений

## 🎯 **Обзор**

Теперь ваши приложения могут использовать API сайта для:
- 📱 **Управления приложениями** (создание, чтение, обновление, удаление)
- 🤖 **Генерации текста** с помощью AI
- 🎨 **Генерации изображений** с помощью AI
- 🔐 **Безопасной аутентификации** через API ключи

## 🚀 **Быстрый старт**

### 1. **Создание API ключа**
1. Перейдите в `/profile` → кнопка **"API"**
2. Нажмите **"Создать ключ"**
3. Настройте права доступа:
   - ✅ **Чтение приложений** - получение списка ваших приложений
   - ✅ **Создание приложений** - создание новых приложений
   - ✅ **Обновление приложений** - изменение существующих приложений
   - ❌ **Удаление приложений** - удаление приложений (по умолчанию отключено)
   - ✅ **Генерация текста** - использование AI для текста
   - ✅ **Генерация изображений** - использование AI для изображений
4. **Сохраните ключ** - вы увидите его только один раз!

### 2. **Базовое использование**
```javascript
// Ваш API ключ (храните безопасно!)
const API_KEY = 'sk_your_api_key_here';
const API_BASE = 'https://yoursite.com/api/app-api';

// Пример запроса
const response = await fetch(`${API_BASE}/user-apps`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log('Мои приложения:', data.apps);
```

## 📚 **API Эндпоинты**

### **Управление приложениями**

#### `GET /api/app-api/user-apps`
Получить список ваших приложений
- **Права:** `read_apps`
- **Ответ:** `{ apps: [...], count: number }`

#### `POST /api/app-api/user-apps`
Создать новое приложение
- **Права:** `create_apps`
- **Тело запроса:**
```json
{
  "name": "Название приложения",
  "description": "Описание",
  "code": "console.log('Hello');",
  "html_template": "<div>HTML</div>",
  "css_styles": "div { color: red; }",
  "is_public": false
}
```

#### `GET /api/app-api/user-apps/[id]`
Получить конкретное приложение
- **Права:** `read_apps`
- **Ответ:** `{ app: {...} }`

#### `PUT /api/app-api/user-apps/[id]`
Обновить приложение
- **Права:** `update_apps`
- **Тело запроса:** Любые поля из POST запроса

#### `DELETE /api/app-api/user-apps/[id]`
Удалить приложение (мягкое удаление)
- **Права:** `delete_apps`

### **AI Генерация**

#### `POST /api/app-api/generate-text`
Генерация текста с помощью AI
- **Права:** `generate_text`
- **Тело запроса:**
```json
{
  "prompt": "Напиши историю о роботе",
  "model": "yandexgpt",
  "maxTokens": 500,
  "temperature": 0.7
}
```
- **Ответ:** `{ text: "...", model: "...", usage: {...} }`

## 💡 **Примеры использования**

### **Простое приложение с AI**
```javascript
const app = document.getElementById('root');
if (app) {
  app.innerHTML = `
    <div style="padding:20px;font-family:Arial;">
      <h1>AI Помощник</h1>
      <input type="text" id="prompt" placeholder="Ваш запрос..." style="width:100%;padding:10px;margin:10px 0;">
      <button onclick="generateText()" style="padding:10px 20px;background:#007bff;color:white;border:none;border-radius:5px;">
        Генерировать текст
      </button>
      <div id="result" style="margin-top:20px;padding:15px;border:1px solid #ddd;border-radius:5px;min-height:100px;"></div>
    </div>
  `;
  
  const API_KEY = 'sk_your_api_key_here';
  
  async function generateText() {
    const prompt = document.getElementById('prompt').value;
    const result = document.getElementById('result');
    
    if (!prompt) {
      result.innerHTML = 'Введите запрос!';
      return;
    }
    
    result.innerHTML = 'Генерирую...';
    
    try {
      const response = await fetch('/api/app-api/generate-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 300
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        result.innerHTML = `<strong>Результат:</strong><br>${data.text}`;
      } else {
        result.innerHTML = `<span style="color:red;">Ошибка: ${data.error}</span>`;
      }
    } catch (error) {
      result.innerHTML = `<span style="color:red;">Ошибка: ${error.message}</span>`;
    }
  }
}
```

### **Приложение для управления другими приложениями**
```javascript
const app = document.getElementById('root');
if (app) {
  app.innerHTML = `
    <div style="padding:20px;font-family:Arial;">
      <h1>Менеджер приложений</h1>
      <button onclick="loadApps()" style="padding:10px 20px;background:#28a745;color:white;border:none;border-radius:5px;margin-bottom:20px;">
        Загрузить мои приложения
      </button>
      <div id="apps-list"></div>
    </div>
  `;
  
  const API_KEY = 'sk_your_api_key_here';
  
  async function loadApps() {
    const appsList = document.getElementById('apps-list');
    appsList.innerHTML = 'Загружаю...';
    
    try {
      const response = await fetch('/api/app-api/user-apps', {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        appsList.innerHTML = `
          <h3>Найдено приложений: ${data.count}</h3>
          ${data.apps.map(app => `
            <div style="border:1px solid #ddd;padding:15px;margin:10px 0;border-radius:5px;">
              <h4>${app.name}</h4>
              <p>${app.description || 'Без описания'}</p>
              <small>Создано: ${new Date(app.created_at).toLocaleDateString()}</small>
            </div>
          `).join('')}
        `;
      } else {
        appsList.innerHTML = `<span style="color:red;">Ошибка: ${data.error}</span>`;
      }
    } catch (error) {
      appsList.innerHTML = `<span style="color:red;">Ошибка: ${error.message}</span>`;
    }
  }
}
```

## 🔒 **Безопасность**

### **Права доступа**
- **read_apps** - Чтение списка и содержимого ваших приложений
- **create_apps** - Создание новых приложений
- **update_apps** - Изменение существующих приложений
- **delete_apps** - Удаление приложений (осторожно!)
- **generate_text** - Использование AI для генерации текста
- **generate_image** - Использование AI для генерации изображений

### **Лучшие практики**
1. **Не храните API ключи в коде** - используйте переменные окружения
2. **Используйте минимальные права** - включайте только нужные разрешения
3. **Регулярно обновляйте ключи** - создавайте новые, удаляйте старые
4. **Мониторьте использование** - проверяйте "Последнее использование"

### **Ограничения**
- **Максимум 10 API ключей** на пользователя
- **Доступ только к своим данным** - нельзя получить чужие приложения
- **Rate limiting** - ограничения на количество запросов (если настроено)

## 🛠️ **Отладка**

### **Частые ошибки**
- **401 Unauthorized** - неверный или отсутствующий API ключ
- **403 Forbidden** - недостаточно прав доступа
- **404 Not Found** - приложение не найдено или не принадлежит вам
- **429 Too Many Requests** - превышен лимит запросов

### **Проверка API ключа**
```javascript
// Простая проверка валидности ключа
async function testApiKey(apiKey) {
  try {
    const response = await fetch('/api/app-api/user-apps', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ API ключ работает');
      return true;
    } else {
      console.log('❌ API ключ не работает:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка проверки:', error.message);
    return false;
  }
}
```

## 🎉 **Готово!**

Теперь ваши приложения могут:
- 🔗 **Интегрироваться с сайтом** через безопасный API
- 🤖 **Использовать AI** для генерации контента
- 📱 **Управлять данными** программно
- 🔐 **Работать безопасно** с правами доступа

**Начните с создания API ключа и попробуйте примеры выше!** 🚀
