# Мониторинг конкурсных списков РГСУ

Веб-приложение для отслеживания приёмной кампании Российского государственного социального университета (РГСУ) в реальном времени.

## Возможности

- **Бюджет и Платное** — переключение между основами приёма; каждое направление имеет собственный конкурсный список.
- **Конкурсные списки** — все абитуриенты с баллами, согласиями/договорами, приоритетами и преимущественным правом.
- **Моя позиция в конкурсе** — поиск по уникальному коду, текущее место в рейтинге, сравнение с проходным баллом.
- **Распределение конкурсных баллов** — гистограмма с подсветкой диапазона проходного балла и точным значением по наведению.
- **Статистика** — карточки с количеством бюджетных мест, поданных заявлений, абитуриентов с оригиналами и без.
- **Тёмная/светлая тема** — переключение с сохранением выбора.
- **Демо-режим** — при недоступности сервера РГСУ используются встроенные демонстрационные данные.
- **Кэширование** — ответы сервера кэшируются на 3 минуты; дублирующие запросы объединяются в один.

## Технологии

- **React 19** + TypeScript
- **Vite 6** — сборка фронтенда
- **Tailwind CSS 4** + shadcn/ui (Radix UI, class-variance-authority)
- **Express 5** — локальный сервер с API
- **Cheerio** — парсинг HTML конкурсных списков `pk.rgsu.net`
- **Motion** — анимации интерфейса
- **esbuild** — компиляция `server.ts` в `dist/server.cjs`
- **Vercel** — деплой (serverless-функции в `api/`)

## Скрипты

| Команда           | Описание                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `npm run dev`     | Dev-сервер: Express (API) + Vite HMR на `http://localhost:3000`       |
| `npm run build`   | Prod-сборка: Vite (фронтенд) + esbuild (`server.ts` → `dist/server.cjs`) |
| `npm start`       | Запуск собранного prod-сервера (`node dist/server.cjs`)               |
| `npm run preview` | Предпросмотр Vite-сборки                                              |
| `npm run lint`    | Проверка типов (`tsc --noEmit`)                                       |
| `npm test`        | Запуск тестов (Vitest)                                                |
| `npm run test:watch` | Запуск тестов в watch-режиме                                       |
| `npm run clean`   | Удаление `dist/`                                                      |

## Запуск локально

```bash
npm install

# Режим разработки
npm run dev

# Prod-сборка и запуск
npm run build
npm start
```

Сервер доступен на `http://localhost:3000` (и по LAN-адресу).

## Тесты

```bash
npm test              # Один запуск
npm run test:watch    # Watch-режим (перезапуск при изменении файлов, выход — Ctrl+C)
```

| Файл                            | Тестов | Что покрывает                                    |
| ------------------------------- | ------ | ------------------------------------------------ |
| `shared/parser.test.ts`         | 13     | Парсинг HTML,座位,updatedAt,edge cases           |
| `src/hooks/useStudents.test.ts` | 8      | Сортировка, фильтрация, rankedStudents           |
| `src/hooks/useStats.test.ts`    | 8      | Статистика, прогноз проходного, средний балл     |
| `src/hooks/useMyPosition.test.ts`| 10     | Позиция студента, поиск по направлениям          |

## Структура проекта

```
pk-rgsu-minsk/
├── api/
│   └── competition/
│       └── [type]/
│           └── [id].ts        # Serverless-функция для Vercel
├── shared/
│   ├── parser.ts              # Общий парсер HTML pk.rgsu.net
│   └── parser.test.ts         # Тесты парсера
├── src/
│   ├── App.tsx                # Корневой компонент, роутинг состояний
│   ├── main.tsx               # Точка входа React
│   ├── index.css              # Глобальные стили
│   ├── competitions.ts        # Список направлений и их ID
│   ├── data.ts                # Типы Student, Competition
│   ├── hooks/
│   │   ├── useCompetitionData.ts  # Загрузка данных конкурса
│   │   ├── useAllCompetitions.ts  # Загрузка всех направлений
│   │   ├── useStudents.ts         # Сортировка и фильтрация
│   │   ├── useStats.ts            # Статистика и прогноз
│   │   ├── useMyPosition.ts       # Позиция студента
│   │   └── *.test.ts              # Тесты хуков
│   ├── components/
│   │   ├── CompetitionHeroBanner.tsx  # Шапка направления (баллы, места)
│   │   ├── CompetitionTable.tsx       # Таблица конкурсного списка
│   │   ├── DistributionView.tsx       # Гистограмма баллов
│   │   ├── Header.tsx                 # Верхняя панель приложения
│   │   ├── MyPositionModal.tsx        # Модал "Моя позиция"
│   │   ├── MyPositionSection.tsx      # Секция поиска позиции
│   │   ├── MyPositionView.tsx         # Отображение найденной позиции
│   │   ├── PinCodeInput.tsx           # Ввод кода абитуриента
│   │   ├── Sidebar.tsx                # Боковая панель навигации
│   │   ├── StatsCards.tsx             # Карточки статистики
│   │   ├── SyncOverlay.tsx            # Оверлей синхронизации данных
│   │   ├── ThemeProvider.tsx          # Провайдер тёмной/светлой темы
│   │   └── ui/                        # shadcn/ui-компоненты
│   ├── constants/
│   │   └── theme.ts           # Токены цветовой темы
│   ├── types/
│   │   └── index.ts           # TypeScript-типы (Student, Direction и др.)
│   └── lib/
│       └── utils.ts           # cn() — утилита объединения классов
├── server.ts                  # Express-сервер (dev + prod), парсер pk.rgsu.net
├── vitest.config.ts           # Конфигурация Vitest
├── vite.config.ts
├── vercel.json                # Конфигурация Vercel (maxDuration: 60s)
└── package.json
```

## API

### Локально (Express)
```
GET /api/competition/:type/:id
```

### Vercel (Serverless)
```
GET /api/competition/[type]/[id]
```

| Параметр | Значения              | Описание              |
| -------- | --------------------- | --------------------- |
| `type`   | `competition`, `contest` | Основа приёма      |
| `id`     | ID направления        | Из `competitions.ts`  |

**Ответ:**
```json
{
  "success": true,
  "data": [...],
  "updatedAt": "05.08.2025 08:00",
  "seats": 25
}
```

Заголовок `X-Cache: HIT | MISS | WAIT` показывает состояние кэша (TTL 3 минуты).

## Деплой на Vercel

Проект готов к деплою без дополнительной настройки:

```bash
vercel --prod
```

Serverless-функция `api/competition/[type]/[id].ts` обрабатывает запросы к `pk.rgsu.net` с таймаутом до 60 секунд.
