# 🚀 Быстрое исправление проблемы с Broadcasts

## Проблема
Не можете зайти на страницу `/broadcasts` - видите ошибку доступа или редирект.

## ⚡ Решение за 3 минуты

### 1️⃣ Запустите диагностику (30 сек)

Сначала установите зависимости (если еще не установлены):
```bash
npm install
```

Затем запустите диагностику:
```bash
npm run diagnose
```

Скрипт покажет, где именно проблема.

### 2️⃣ Используйте страницу отладки (1 мин)

1. Откройте: **http://localhost:3000/debug**
2. Нажмите кнопку: **"Set Admin Role"**
3. Дождитесь сообщения об успехе
4. Нажмите: **"Test Broadcasts Access"**

### 3️⃣ Проверьте результат (30 сек)

Перейдите на: **http://localhost:3000/broadcasts**

Если работает - готово! 🎉

## 🔧 Если не помогло

### Вариант A: Исправьте RLS политики

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Выполните файл: `migrations/fix_broadcasts_rls_policies.sql`
3. Обновите страницу `/broadcasts`

### Вариант B: Перелогиньтесь

1. Откройте DevTools (F12) → Application → Cookies
2. Удалите cookie `sb-rajacaayhzgjoitquqvt-auth-token`
3. Перейдите на `/auth` и войдите заново
4. Повторите шаги 1-3 из раздела "Решение"

### Вариант C: Создайте профиль вручную

В Supabase Dashboard → SQL Editor:

```sql
-- Замените 'ваш-user-id' на ваш реальный ID
INSERT INTO profiles (id, role) 
VALUES ('ваш-user-id', 'admin')
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';
```

Узнать свой user-id можно на странице `/debug`.

## 📋 Checklist

- [ ] Сервер запущен (`npm run dev`)
- [ ] Вы авторизованы (зашли через `/auth`)
- [ ] Профиль создан (проверьте на `/debug`)
- [ ] Роль установлена как `admin` или `editor`
- [ ] RLS политики настроены (выполнена миграция)

## 📚 Подробная документация

Если нужна детальная информация:
- [BROADCASTS_DIAGNOSTIC_SUMMARY.md](BROADCASTS_DIAGNOSTIC_SUMMARY.md) - Полный отчет
- [docs/BROADCASTS_DEBUG_GUIDE.md](docs/BROADCASTS_DEBUG_GUIDE.md) - Руководство по отладке
- [BROADCASTS_FIX_README.md](BROADCASTS_FIX_README.md) - Быстрое исправление

## 💡 Частые вопросы

**Q: Ошибка "Unauthorized"**  
A: Перелогиньтесь на `/auth`

**Q: Ошибка "User profile not found"**  
A: Нажмите "Set Admin Role" на `/debug`

**Q: Ошибка "Permission denied"**  
A: Выполните миграцию `fix_broadcasts_rls_policies.sql`

**Q: Ошибка "Table does not exist"**  
A: Выполните миграцию `create_sent_mails_table.sql`

---

**Нужна помощь?** Запустите диагностический скрипт и проверьте логи в консоли браузера (F12).
