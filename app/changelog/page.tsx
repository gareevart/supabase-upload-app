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
    version: "Release 0.0.1",
    date: "2025-07-19",
    sections: [
      {
        title: "Новые возможности",
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
      filesChanged: "25+ файлов затронуто",
      linesAdded: "1500+ строк кода добавлено",
      linesOptimized: "300+ строк кода оптимизировано",
      focus: "Email-рассылки, улучшение чат-системы и пользовательский опыт"
    },
    newPages: [
      { path: "/broadcasts", description: "Главная страница управления email-рассылками" },
      { path: "/broadcasts/new", description: "Создание новой рассылки" },
      { path: "/broadcasts/[id]", description: "Просмотр деталей рассылки" },
      { path: "/broadcasts/edit/[id]", description: "Редактирование существующей рассылки" },
      { path: "API endpoints", description: "Полный набор API для работы с рассылками (/api/broadcasts/*)" }
    ],
    requirements: [
      { feature: "Email-рассылки", requirement: "Требуется настройка Resend API и роль admin/editor" },
      { feature: "Планировщик рассылок", requirement: "Требуется настройка cron-задач для автоматической отправки" },
      { feature: "База данных", requirement: "Добавлена таблица sent_mails для хранения рассылок" }
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

        {/* Statistics */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Icon data={ChartColumn} size={24} />
            <Text variant="header-1">Статистика изменений</Text>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Text variant="body-2" className="font-semibold">
                {changelogData.statistics.filesChanged}
              </Text>
              <Text variant="caption-1" className="text-gray-600">
                (включая новые компоненты и API endpoints)
              </Text>
            </div>
            <div className="space-y-2">
              <Text variant="body-2" className="font-semibold">
                {changelogData.statistics.linesAdded}
              </Text>
            </div>
            <div className="space-y-2">
              <Text variant="body-2" className="font-semibold">
                {changelogData.statistics.linesOptimized}
              </Text>
            </div>
            <div className="space-y-2">
              <Text variant="body-2" className="font-semibold">
                Основной фокус:
              </Text>
              <Text variant="body-1" className="text-gray-600">
                {changelogData.statistics.focus}
              </Text>
            </div>
          </div>
        </Card>

        {/* New Pages */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Icon data={Link} size={24} />
            <Text variant="header-1">Новые разделы и страницы</Text>
          </div>
          
          <div className="space-y-4">
            {changelogData.newPages.map((page, index) => (
              <div key={index} className="py-2 border-l-2 border-blue-200 pl-4">
                <Text variant="body-2" className="font-mono bg-gray-100 px-2 py-1 rounded text-sm mb-1">
                  {page.path}
                </Text>
                <Text variant="body-1" className="text-gray-600">
                  {page.description}
                </Text>
              </div>
            ))}
          </div>
        </Card>

        {/* Requirements */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Icon data={Gear} size={24} />
            <Text variant="header-1">🛠️ Требования для новых функций</Text>
          </div>
          
          <div className="space-y-4">
            {changelogData.requirements.map((req, index) => (
              <div key={index} className="py-2 border-l-2 border-orange-200 pl-4">
                <Text variant="body-2" className="font-semibold mb-1">
                  • {req.feature}:
                </Text>
                <Text variant="body-1" className="text-gray-600">
                  {req.requirement}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default ChangelogPage;
