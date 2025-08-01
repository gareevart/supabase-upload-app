"use client";

import React from 'react';
import { 
  Text, 
  Card, 
  Icon, 
  Label, 
  Divider,
  Container
} from '@gravity-ui/uikit';
import { 
  Star, 
  Rocket, 
  Wrench, 
  ChartColumn, 
  Link, 
  Gear,
  Envelope,
  FileArrowUp,
  Palette,
  Person,
  FileText,
  PencilToSquare,
  Comment,
  ChartLine,
  LayoutList
} from '@gravity-ui/icons';

const ChangelogPage = () => {
  const changelogData = {
    version: "Release 0.0.2",
    date: "2025-08-01",
    sections: [
      {
        title: "Исправления и улучшения",
        icon: Wrench,
        color: "warning",
        items: [
          {
            title: "Навигация",
            icon: LayoutList,
            features: [
              { name: "Рефакторинг навигации", description: "Удалена старая система навигации NavBar и полностью переработана основная навигация" },
              { name: "Улучшенная мобильная навигация", description: "Добавлен выдвижной drawer для мобильных устройств с улучшенным UX" },
              { name: "Активное состояние элементов", description: "Улучшена логика определения активного элемента навигации на основе текущего URL" },
              { name: "Оптимизация производительности", description: "Убраны неиспользуемые компоненты навигации для улучшения производительности" }
            ]
          },
          {
            title: "Блог-система",
            icon: FileText,
            features: [
              { name: "Пагинация постов", description: "Добавлена полноценная пагинация для списка постов с поддержкой мобильных устройств" },
              { name: "Улучшенная загрузка", description: "Оптимизирована загрузка постов с правильным подсчетом общего количества" },
              { name: "Фильтрация контента", description: "Улучшена логика фильтрации опубликованных постов и черновиков" },
              { name: "Адаптивный дизайн", description: "Улучшена адаптивность списка постов для различных размеров экранов" },
              { name: "Оптимизация изображений", description: "Добавлена ленивая загрузка изображений и правильные размеры для лучшей производительности" }
            ]
          },
          {
            title: "Система безопасности",
            icon: Gear,
            features: [
              { name: "Исправление функции has_role", description: "Исправлена критическая ошибка в функции проверки ролей для анонимных пользователей" },
              { name: "RLS политики", description: "Улучшена работа Row Level Security политик с корректной обработкой NULL значений" },
              { name: "Доступ к публичному контенту", description: "Исправлен доступ неавторизованных пользователей к публичным постам блога" }
            ]
          }
        ]
      },
      {
        title: "Технические улучшения",
        icon: ChartLine,
        color: "info",
        items: [
          {
            title: "Система тем",
            icon: Palette,
            features: [
              { name: "Улучшенная обработка тем", description: "Переработана логика переключения тем с лучшей поддержкой системных настроек" },
              { name: "Оптимизация производительности", description: "Улучшена производительность переключения тем без перезагрузки страницы" },
              { name: "Исправление гидратации", description: "Устранены проблемы с гидратацией при инициализации темы" }
            ]
          },
          {
            title: "Архитектура приложения",
            icon: Wrench,
            features: [
              { name: "Очистка кодовой базы", description: "Удалены неиспользуемые компоненты и файлы для улучшения производительности" },
              { name: "Оптимизация импортов", description: "Улучшена структура импортов и зависимостей компонентов" },
              { name: "Улучшенная типизация", description: "Добавлена более строгая типизация для компонентов навигации и блога" }
            ]
          }
        ]
      },
      {
        title: "Новые возможности (предыдущий релиз)",
        icon: Star,
        color: "success",
        items: [
          {
            title: "Email-рассылки",
            icon: Envelope,
            features: [
              { name: "Создание рассылок", description: "Новый раздел для создания и управления email-рассылками с богатым текстовым редактором" },
              { name: "Планирование отправки", description: "Возможность запланировать отправку рассылки на определенное время и дату" },
              { name: "Мгновенная отправка", description: "Отправка рассылок немедленно одним кликом" },
              { name: "Управление получателями", description: "Удобное добавление и управление списком email-адресов получателей" },
              { name: "Предпросмотр писем", description: "Полноценный предпросмотр того, как будет выглядеть письмо у получателей" },
              { name: "Отладочная информация", description: "Встроенные инструменты для отладки содержимого и структуры писем" },
              { name: "Фильтрация по статусам", description: "Просмотр рассылок по статусам: черновики, запланированные, отправленные, неудачные" },
              { name: "Аналитика рассылок", description: "Отслеживание статистики открытий и кликов по отправленным письмам" },
              { name: "Ролевая система доступа", description: "Доступ к функции только для пользователей с ролями admin или editor" }
            ]
          },
          {
            title: "Загрузка файлов через Yandex Cloud",
            icon: FileArrowUp,
            features: [
              { name: "Новый загрузчик файлов", description: "Добавлен компонент YandexFileUploader для удобной загрузки файлов в Yandex Cloud Storage" },
              { name: "Предпросмотр изображений", description: "Пользователи могут видеть превью загружаемых изображений перед отправкой" },
              { name: "Валидация файлов", description: "Автоматическая проверка типа и размера файлов перед загрузкой" },
              { name: "Удаление файлов", description: "Возможность удалять ранее загруженные файлы одним кликом" }
            ]
          },
          {
            title: "Улучшенная система тем",
            icon: Palette,
            features: [
              { name: "Выбор темы в профиле", description: "Пользователи могут выбирать между светлой, темной и системной темой прямо в профиле" },
              { name: "Сохранение предпочтений", description: "Выбранная тема автоматически сохраняется и применяется при следующем входе" },
              { name: "Улучшенная адаптация к системной теме", description: "Более стабильная работа с автоматическим переключением темы в зависимости от настроек системы" }
            ]
          }
        ]
      },
      {
        title: "Улучшения пользовательского опыта",
        icon: Rocket,
        color: "info",
        items: [
          {
            title: "Профиль пользователя",
            icon: Person,
            features: [
              { name: "Расширенный интерфейс профиля", description: "Полностью переработанная страница профиля с улучшенной навигацией" },
              { name: "Интеграция селектора тем", description: "Встроенный выбор темы прямо в настройках профиля" },
              { name: "Улучшенная загрузка аватаров", description: "Новый компонент для загрузки аватаров с предпросмотром и валидацией" }
            ]
          },
          {
            title: "Блог-система",
            icon: FileText,
            features: [
              { name: "Упрощенный список постов", description: "Оптимизированное отображение списка постов для лучшей производительности" },
              { name: "Режим сетки по умолчанию", description: "Посты теперь отображаются в удобном сеточном формате" },
              { name: "Улучшенная навигация", description: "Более интуитивная навигация между постами и разделами блога" }
            ]
          },
          {
            title: "Редактор контента",
            icon: PencilToSquare,
            features: [
              { name: "Стабильность TipTap редактора", description: "Исправлены ошибки в работе текстового редактора" },
              { name: "Улучшенное отображение контента", description: "Более корректное отображение форматированного текста" },
              { name: "Обновленные стили редактора", description: "Современный и удобный интерфейс для создания контента" }
            ]
          },
          {
            title: "Чат",
            icon: Comment,
            features: [
              { name: "Улучшенный интерфейс чата", description: "Обновленный дизайн чат-интерфейса с лучшей читаемостью сообщений" },
              { name: "Настройки чата", description: "Возможность настройки системного промпта для каждого чата индивидуально" },
              { name: "Копирование сообщений", description: "Удобное копирование сообщений в буфер обмена одним кликом" },
              { name: "Индикатор печати", description: "Визуальный индикатор когда ассистент печатает ответ" },
              { name: "Счетчик токенов", description: "Отображение количества использованных токенов в каждом чате" },
              { name: "Улучшенная обработка ошибок", description: "Более информативные уведомления об ошибках с помощью toast-сообщений" },
              { name: "Поддержка Markdown", description: "Полная поддержка форматирования Markdown в сообщениях" }
            ]
          }
        ]
      },
      {
        title: "Технические улучшения",
        icon: Wrench,
        color: "warning",
        items: [
          {
            title: "Производительность",
            icon: ChartLine,
            features: [
              { name: "Оптимизация главного макета", description: "Улучшена архитектура основного макета приложения для быстрой загрузки" },
              { name: "Рефакторинг системы тем", description: "Более эффективная обработка переключения тем без перезагрузки страницы" },
              { name: "Улучшенная обработка ошибок", description: "Более информативные сообщения об ошибках для пользователей" }
            ]
          },
          {
            title: "Интерфейс",
            icon: LayoutList,
            features: [
              { name: "Обновленные стили", description: "Исправления в CSS для лучшей совместимости и внешнего вида" },
              { name: "Улучшенный поиск", description: "Более стабильная работа компонента поиска" },
              { name: "Адаптивность", description: "Лучшая работа интерфейса на различных устройствах" }
            ]
          }
        ]
      }
    ],
    statistics: {
      filesChanged: "10+ файлов изменено",
      linesAdded: "200+ строк кода добавлено",
      linesOptimized: "150+ строк кода оптимизировано",
      linesRemoved: "500+ строк устаревшего кода удалено",
      focus: "Исправления безопасности, оптимизация навигации и улучшение блог-системы"
    },
    newPages: [
      { path: "Миграция БД", description: "fix_has_role_function_for_anonymous_users.sql - исправление функции проверки ролей" }
    ],
    requirements: [
      { feature: "Миграция БД", requirement: "Необходимо выполнить миграцию fix_has_role_function_for_anonymous_users.sql" },
      { feature: "Безопасность", requirement: "Обновлена функция has_role для корректной работы с анонимными пользователями" },
      { feature: "Производительность", requirement: "Рекомендуется очистка кэша после обновления навигации" }
    ]
  };

  return (
    <Container maxWidth="xl" className="py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Text variant="display-2" className="mb-2">
            Changelog
          </Text>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Label theme="success" size="m">
              {changelogData.version}
            </Label>
            <Text variant="body-1">
              {changelogData.date}
            </Text>
          </div>
        </div>

        {/* Main Sections */}
        {changelogData.sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Icon data={section.icon} size={24} />
              <Text variant="header-1">{section.title}</Text>
            </div>

            <div className="space-y-6">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon data={item.icon} size={20} />
                    <Text variant="subheader-1">{item.title}</Text>
                  </div>
                  
                  <div className="space-y-3">
                    {item.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="py-2 border-l-2 border-gray-200 pl-4 flex flex-col">
                        <Text variant="body-2" className="font-semibold mb-1">
                        {feature.name}
                        </Text>
                        <Text variant="body-1" color="complementary">
                          {feature.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                  
                  {itemIndex < section.items.length - 1 && (
                    <Divider className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
    </div>
    </Container>
  );
};

export default ChangelogPage;
