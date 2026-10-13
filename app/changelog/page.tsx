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
  LayoutList,
  CircleExclamation,
  ShieldCheck
} from '@gravity-ui/icons';
import './Changelog.css';

const ChangelogPage = () => {
  const changelogData = {
    version: "Release 0.0.4",
    date: "2025-10-10",
    sections: [
      {
        title: "Новые возможности",
        icon: Star,
        color: "success",
        items: [
          {
            title: "Анализ изображений в чате",
            icon: Comment,
            features: [
              { name: "Интеграция с Yandex Vision API", description: "YandexGPT теперь может читать и понимать содержимое изображений" },
              { name: "OCR (распознавание текста)", description: "Автоматическое извлечение текста с изображений на русском и английском языках" },
              { name: "Загрузка файлов", description: "Поддержка загрузки до 3 файлов на сообщение с drag & drop интерфейсом" },
              { name: "Умные ответы", description: "AI отвечает на вопросы о содержимом изображений с учетом извлеченного текста" },
              { name: "Чистый UI", description: "Техническая информация об анализе скрыта от пользователя, сохраняется только для AI" },
              { name: "Оптимизация изображений", description: "Использование Next.js Image для быстрой загрузки и оптимизации изображений" }
            ]
          }
        ]
      },
      {
        title: "Исправления ошибок",
        icon: CircleExclamation,
        color: "danger",
        items: [
          {
            title: "Чат",
            icon: Comment,
            features: [
              { name: "Исправлена ошибка 'empty message text'", description: "Добавлена фильтрация пустых сообщений из истории чата" },
              { name: "Исправлен баг Vision API", description: "Исправлен доступ к результатам OCR: results[0].textDetection" },
              { name: "Улучшена обработка вложений", description: "Корректная обработка сообщений с файлами в контексте диалога" }
            ]
          },
          {
            title: "TipTap Редактор",
            icon: PencilToSquare,
            features: [
              { name: "Исправлена проблема с курсором", description: "При редактировании текста в середине предложения курсор больше не перепрыгивает в конец" },
              { name: "Оптимизация обновлений контента", description: "Добавлен флаг isInternalUpdate для отслеживания обновлений от самого редактора" },
              { name: "Улучшенная стабильность", description: "useEffect теперь игнорирует обновления контента, если они пришли от редактора" }
            ]
          },
          {
            title: "Аутентификация в Safari",
            icon: ShieldCheck,
            features: [
              { name: "Исправлена ошибка AuthError", description: "Устранены проблемы с аутентификацией Supabase в браузере Safari" },
              { name: "Исправлены API routes", description: "API routes больше не возвращают 401 Unauthorized для авторизованных пользователей" },
              { name: "Унификация клиентов Supabase", description: "Теперь используется единый клиент с localStorage вместо cookie-логики" },
              { name: "Улучшенная обработка ошибок", description: "Добавлена улучшенная обработка ошибок в AuthContext с PKCE flow" },
              { name: "Helper authFetch", description: "Создан helper для работы с API routes через Authorization header" },
              { name: "Исправлена валидация токена", description: "Критическое исправление в withApiAuth - теперь используется правильный метод supabase.auth.getUser(token)" }
            ]
          }
        ]
      }
    ],
    statistics: {
      filesChanged: "15+ файлов изменено",
      linesAdded: "400+ строк кода добавлено",
      linesOptimized: "200+ строк кода оптимизировано",
      focus: "Интеграция анализа изображений с Yandex Vision API и критические исправления безопасности"
    },
    documentation: [
      { path: "docs/YANDEX_VISION_INTEGRATION.md", description: "Полное руководство по интеграции Yandex Vision API для анализа изображений" },
      { path: "docs/YANDEX_VISION_CHANGELOG.md", description: "История изменений и этапы разработки функции анализа изображений" },
      { path: "docs/CHAT_FILE_ATTACHMENTS.md", description: "Документация по реализации загрузки файлов в чат" },
      { path: "docs/MIGRATION_AUTH_FETCH.md", description: "Руководство по миграции на новый helper authFetch" },
      { path: "docs/SAFARI_AUTH_FIX.md", description: "Решение проблем с аутентификацией в Safari" },
      { path: "docs/TIPTAP_CURSOR_FIX.md", description: "Исправление проблемы с курсором в TipTap редакторе" },
      { path: "docs/BUGFIX_EMPTY_MESSAGE.md", description: "Исправление ошибки с пустыми сообщениями в чате" },
      { path: "migrations/add_attachments_to_chat_messages.sql", description: "SQL миграция для добавления поддержки вложений в сообщениях" }
    ],
    previousReleases: [
      {
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
      }
    ]
  };

  const previousReleases = changelogData.previousReleases;

  return (
    <Container maxWidth="xl" className="changelog-page">
      <div className="changelog-page__content">
        {/* Header */}
        <div className="changelog-page__header">
          <Text variant="display-2" className="changelog-page__title">
            Changelog
          </Text>
          <div className="changelog-page__version-row">
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
          <Card key={sectionIndex} className="changelog-page__card">
            <div className="changelog-page__section-header">
              <Icon data={section.icon} size={24} />
              <Text variant="header-1">{section.title}</Text>
            </div>

            <div className="changelog-page__section-list">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex}>
                  <div className="changelog-page__item-header">
                    <Icon data={item.icon} size={20} />
                    <Text variant="subheader-1">{item.title}</Text>
                  </div>
                  
                  <div className="changelog-page__feature-list">
                    {item.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="changelog-page__feature">
                        <Text variant="body-2" className="changelog-page__feature-name">
                        {feature.name}
                        </Text>
                        <Text variant="body-1" color="complementary">
                          {feature.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                  
                  {itemIndex < section.items.length - 1 && (
                    <Divider className="changelog-page__divider" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Statistics */}
        {changelogData.statistics && (
          <Card className="changelog-page__card">
            <div className="changelog-page__section-header">
              <Icon data={ChartColumn} size={24} />
              <Text variant="header-1">Статистика изменений</Text>
            </div>
            <div className="changelog-page__stats-list">
              <Text variant="body-1">📁 {changelogData.statistics.filesChanged}</Text>
              <Text variant="body-1">➕ {changelogData.statistics.linesAdded}</Text>
              {changelogData.statistics.linesOptimized && (
                <Text variant="body-1">⚡ {changelogData.statistics.linesOptimized}</Text>
              )}
              <Text variant="body-1">🎯 Фокус: {changelogData.statistics.focus}</Text>
            </div>
          </Card>
        )}

        {/* Documentation */}
        {changelogData.documentation && changelogData.documentation.length > 0 && (
          <Card className="changelog-page__card">
            <div className="changelog-page__section-header">
              <Icon data={FileText} size={24} />
              <Text variant="header-1">Документация</Text>
            </div>
            <div className="changelog-page__doc-list">
              {changelogData.documentation.map((doc, index) => (
                <div key={index} className="changelog-page__doc-item">
                  <Text variant="body-2" className="changelog-page__doc-path">
                    {doc.path}
                  </Text>
                  <Text variant="body-1" color="complementary">
                    {doc.description}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Previous Releases */}
        {previousReleases && previousReleases.length > 0 && (
          <div className="changelog-page__releases">
            <Divider />
            <Text variant="header-1" className="changelog-page__release-title">Предыдущие релизы</Text>
            
            {previousReleases.map((release, releaseIndex) => (
              <div key={releaseIndex} className="changelog-page__release">
                <div className="changelog-page__release-header">
                  <div className="changelog-page__release-version">
                    <Label theme="info" size="m">
                      {release.version}
                    </Label>
                    <Text variant="body-1">
                      {release.date}
                    </Text>
                  </div>
                </div>

                {release.sections.map((section, sectionIndex) => (
                  <Card key={sectionIndex} className="changelog-page__card">
                    <div className="changelog-page__section-header">
                      <Icon data={section.icon} size={24} />
                      <Text variant="header-1">{section.title}</Text>
                    </div>

                    <div className="changelog-page__section-list">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex}>
                          <div className="changelog-page__item-header">
                            <Icon data={item.icon} size={20} />
                            <Text variant="subheader-1">{item.title}</Text>
                          </div>
                          
                          <div className="changelog-page__feature-list">
                            {item.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="changelog-page__feature">
                                <Text variant="body-2" className="changelog-page__feature-name">
                                {feature.name}
                                </Text>
                                <Text variant="body-1" color="complementary">
                                  {feature.description}
                                </Text>
                              </div>
                            ))}
                          </div>
                          
                          {itemIndex < section.items.length - 1 && (
                            <Divider className="changelog-page__divider" />
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}

                {release.statistics && (
                  <Card className="changelog-page__card">
                    <div className="changelog-page__section-header">
                      <Icon data={ChartColumn} size={24} />
                      <Text variant="header-1">Статистика изменений</Text>
                    </div>
                    <div className="changelog-page__stats-list">
                      <Text variant="body-1">📁 {release.statistics.filesChanged}</Text>
                      <Text variant="body-1">➕ {release.statistics.linesAdded}</Text>
                      {release.statistics.linesOptimized && (
                        <Text variant="body-1">⚡ {release.statistics.linesOptimized}</Text>
                      )}
                      {release.statistics.linesRemoved && (
                        <Text variant="body-1">➖ {release.statistics.linesRemoved}</Text>
                      )}
                      <Text variant="body-1">🎯 Фокус: {release.statistics.focus}</Text>
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export default ChangelogPage;
