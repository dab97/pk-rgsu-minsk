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
| `shared/parser.test.ts`         | 20     | Парсинг HTML, seats, updatedAt, edge cases + валидация входа (SSRF) |
| `src/hooks/useStudents.test.ts` | 8      | Сортировка (включая тай-брейк), фильтрация, rankedStudents |
| `src/hooks/useStats.test.ts`    | 8      | Статистика, прогноз проходного, средний балл     |
| `src/hooks/useMyPosition.test.ts`| 12     | Позиция студента, поиск по направлениям, error-состояние упавших |

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
│   │   ├── useAllCompetitions.ts  # Загрузка всех направлений (TTL 3 мин, retry)
│   │   ├── useSeatsByComp.ts      # Владелец seatsByComp + localStorage
│   │   ├── useStudents.ts         # Сортировка и фильтрация
│   │   ├── useStats.ts            # Статистика и прогноз
│   │   ├── useMyPosition.ts       # Позиция студента
│   │   └── *.test.ts              # Тесты хуков
│   ├── components/
│   │   ├── CompetitionHeroBanner.tsx  # Шапка направления (баллы, места)
│   │   ├── CompetitionTable.tsx       # Таблица конкурсного списка
│   │   ├── DistributionView.tsx       # Гистограмма баллов
│   │   ├── ErrorBoundary.tsx          # Граница ошибок рендера (fallback вместо белого экрана)
│   │   ├── Header.tsx                 # Верхняя панель приложения
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

## Резервный архив приказов

Приказы о зачислении на бюджет — финальные документы, после публикации они не меняются, но теоретически могут быть удалены с `pk.rgsu.net`. Для подстраховки реализован локальный архив:

### Скачивание архива

```bash
npm run archive:orders
```

Скрипт `scripts/fetch-orders.ts` обходит все бюджетные направления из `competitions.ts` (только с маркером `/enrolled`), парсит каждое через тот же `parseRgsuHtml`, что и runtime, и сохраняет в `public/orders/<competitionId>.json` + `manifest.json`. Лимит 5 МБ на ответ, таймаут 50 секунд.

### Fallback в API

При недоступности `pk.rgsu.net` (таймаут / 5xx / network error) сервер **сначала пытается отдать локальный архив**:

- Express (`server.ts`) — читает напрямую из `public/orders/*.json`.
- Vercel serverless (`api/competition/[type]/[id].ts`) — если FS недоступна, делает fetch к `/orders/<id>.json` своего же приложения.

В обоих случаях:
- HTTP-заголовок `X-Source: archive`, `X-Archive-Date: <iso>`.
- JSON-поле `source: "archive"`, `archivedAt: "<iso>"`.
- Добавляется warning: `«Данные из локального архива — сервер pk.rgsu.net временно недоступен»`.

### Индикатор в UI

В `CompetitionHeroBanner` отображается бейдж:
- **`live`** — зелёный «Актуальные данные с pk.rgsu.net».
- **`archive`** — янтарный «Данные из локального архива» + дата архивации.

## Смена приёмной кампании (ежегодное обновление)

Все данные кампании собраны в одном файле — **`src/competitions.ts`**. Новая кампания = правка только этого файла:

| Что менять                                                | Где именно                                            |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Год кампании (шапка печатных шаблонов «Приёмная комиссия — 20XX») | константа `CAMPAIGN_YEAR`                             |
| Ссылки на конкурсные списки (UUID с pk.rgsu.net)           | поле `url` каждой записи                              |
| Число мест (запасное значение до первого ответа сервера)   | поле `seats` каждой записи                            |
| Длительность обучения                                     | поле `studyDuration` (`'4 года'` / `'4.5 года'`)      |
| Набор направлений / форм обучения / основ                  | записи массива `competitions`                         |

Год и длительности больше нигде не дублируются: UI импортирует `CAMPAIGN_YEAR`, баннер направления рендерит `studyDuration` из данных.

После правки данных:

```bash
npm run lint && npm test
```

и пересобрать архив приказов (если ведётся): `npm run archive:orders`.

Файлы отказов (`Отказы*.csv`) содержат персональные данные абитуриентов — они добавлены в `.gitignore` и в репозиторий не коммитятся.

### Редкие правки вне `competitions.ts`

- **Домен `pk.rgsu.net`** (если сайт приёмной комиссии переедет): `src/lib/api.ts` (маркер в `getCompetitionPath`), `server.ts` (URL запроса), `shared/parser.ts` (`buildSafeRgsuUrl` — он же якорь SSRF-защиты), `shared/competition-map.ts`. Менять синхронно во всех местах.
- **Диапазон длины PIN-кода абитуриента**: значения по умолчанию (`minLength = 6`, `maxLength = 8`) в `src/components/PinCodeInput.tsx`; фактические длины ИД в кампании-2026 — 6 и 7 цифр (проверено по архивам приказов и CSV отказов). Поле адаптивное: показывает 7 ячеек (`defaultLength`, доминирующая длина) и расширяется до 8, только если введена восьмая цифра.

## Безопасность

Проект прошёл аудит безопасности (см. `SECURITY_TASKS.md`). Применённые меры:

### Серверная часть (Express + Vercel serverless)
- **Helmet** — security headers: HSTS (1 год, `includeSubDomains`, `preload`), Referrer-Policy, X-Frame-Options, Permissions-Policy.
- **CSP** — строгая Content-Security-Policy включается в production (`script-src 'self'`, `frame-ancestors 'none'`, `connect-src 'self'`).
- **Security headers для Vercel** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP, HSTS — заданы в `vercel.json` и применяются ко всем роутам.
- **Rate limiting** — `express-rate-limit` на `/api/competition/*` (по умолчанию 60 req/min на IP, настраивается через `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`).
- **Валидация входа** — единая функция `buildSafeRgsuUrl(type, id)` в `shared/parser.ts`: проверка `type ∈ {competition, contest}`, regex `^[A-Za-z0-9_\-]{1,256}$` для `id`, проверка `hostname === 'pk.rgsu.net'` через `new URL()`. Защищает от SSRF и path-traversal.
- **Лимит размера ответа** — `MAX_RESPONSE_BYTES` (5 МБ) с потоковым чтением через `Response.body.getReader()` + проверка `Content-Length` + `reader.cancel()` при превышении.
- **LRU-кэш** — `lru-cache` с `max: 500`, `ttlAutopurge: true` (настраивается через `CACHE_MAX_ENTRIES`).
- **Безопасные коды ошибок** — клиенту возвращаются категории (`Upstream timeout`, `Upstream response too large`, `Upstream fetch failed`), а не сырой `error.message`.
- **Санитизация логов** — логируется только `kind` (TIMEOUT / TOO_LARGE / FETCH_FAILED) и `cacheKey`, без полного `error.message` (исключает утечку URL с id).

### Парсер HTML
- Все regex с `[\s\S]*?` (catastrophic backtracking) заменены на безопасный `indexOf`-парсинг тегов `<tr>` / `<td>`.
- Seat-парсер автоматически определяет тип тега (`<div>`/`<span>`) вместо захардкоженного `</span>`.

### api-proxy.php (резервный прокси)
- `CURLOPT_PROTOCOLS=CURLPROTO_HTTPS`, `CURLOPT_REDIR_PROTOCOLS=CURLPROTO_HTTPS` — только HTTPS, защита от редиректа на file:// / gopher://.
- `CURLOPT_MAXREDIRS=3`, `CURLOPT_SSL_VERIFYPEER/HOST=true`.
- Проверка `CURLINFO_EFFECTIVE_URL` — итоговый URL должен остаться на `pk.rgsu.net` (защита от SSRF через редирект).
- Валидация `id`: `^[A-Za-z0-9_\-]{1,256}$`.
- Лимит скачанного ответа — 5 МБ (защита от OOM).
- CORS — whitelist origin через env `ALLOWED_ORIGINS`.
- Method-check: только GET (405 на остальные).

### Зависимости
- `@vercel/node` зафиксирован на `3.0.1` (downgrade с 5.x) для устранения high CVE в `undici` (CRLF injection, smuggling, WebSocket DoS), `js-yaml` (quadratic DoS), `minimatch` (ReDoS).
- Оставшиеся moderate CVE (`ajv`, `esbuild`) — только в dev-зависимостях `@vercel/node`, на проде не выполняются.

### XSS / инъекции
- React автоматически экранирует текст — `dangerouslySetInnerHTML` не используется.
- `eval`, `new Function`, `document.write`, `innerHTML` отсутствуют в клиентском коде.
- Секреты не хранятся в репозитории (`.env*` в `.gitignore`).
