# Мониторинг конкурсных списков РГСУ — Design System Reference

> **High-Density Admission Command Center** — профессиональная информационно-аналитическая система приёмной комиссии РГСУ с двухканальной цветовой акцентуацией, плоскими поверхностями, адаптивным управлением и высококонтрастным форматом печатных отчётов.

**Theme:** dual-mode (Light / Dark with automatic system preference fallback)

Система представляет собой строгий, современный и информационно-плотный командный интерфейс для отслеживания хода приёмной кампании в реальном времени. В основе дизайна лежит концепция нестираемой визуальной ясности: нейтральный slate-каркас поддерживает весь контент, а два параллельных акцентных канала (Teal/Emerald для бюджетной формы и Amber/Gold для платной) моментально информируют операторов и абитуриентов о выбранном контексте зачисления. Интерфейс избавлен от декоративных тяжелых теней в пользу микро-границ 1px, скруглений класса Squircle и моноширинной типографики для ключевых цифровых метрик и условных кодов.

---

## Colors

Система использует строго регламентированную палитру на основе Tailwind Slate в сочетании с динамическими акцентными темами в зависимости от формы обучения (`Бюджет` vs `Платное`).

### Neutral Canvas & Surfaces

| Name | Tailwind / Hex | Role |
|------|----------------|------|
| Canvas Light | `#f8fafc` (`bg-slate-50`) | Основной фон страницы в светлой теме |
| Canvas Dark | `#0f172a` / `#020617` (`dark:bg-slate-900`, `dark:bg-slate-950`) | Основной фон страницы в тёмной теме |
| Card Light | `#ffffff` (`bg-white`) | Поверхность карточек, таблиц и плашек в светлой теме |
| Card Dark | `#0f172a` (`dark:bg-slate-900`) | Поверхность карточек и таблиц в тёмной теме |
| Subcard Light | `#f1f5f9` (`bg-slate-100`, `bg-slate-50/70`) | Вложенные панели, фоны шапок таблиц и инпутов |
| Subcard Dark | `#1e293b` (`dark:bg-slate-800`, `dark:bg-slate-900/70`) | Вложенные панели в тёмном режиме |
| Ink Primary | `#0f172a` / `#f8fafc` (`text-slate-900`, `dark:text-slate-100`) | Заголовки, первичный текст, критические цифры |
| Ink Secondary | `#64748b` / `#94a3b8` (`text-slate-500`, `dark:text-slate-400`) | Вторичные подписи, метаданные, неактивные табы |
| Ink Muted | `#94a3b8` / `#64748b` (`text-slate-400`, `dark:text-slate-500`) | Подсказки, плейсхолдеры, иконные штрихи |
| Hairline Border | `border-slate-200/80` / `dark:border-slate-800` | Контурные микро-границы всех карточек и элементов (1px) |

### Accent Systems (Dynamic Basis Context)

#### 1. Бюджетная основа (Teal / Emerald Theme)
- **Primary Accent Text:** `text-teal-600` (`#0d9488`) / `dark:text-teal-400` (`#2dd4bf`)
- **Strong Title Text:** `text-teal-800` / `dark:text-teal-300`
- **Soft Background Surface:** `bg-teal-50` / `dark:bg-teal-950/20`
- **Border Highlight:** `border-teal-200` / `dark:border-teal-900`
- **Solid Hero Card:** `bg-teal-700` (`#0f766e`) / `dark:bg-teal-800`
- **Pass Zone Highlight:** `bg-emerald-50/40` (`dark:bg-emerald-900/10`), граница `border-b-emerald-500`

#### 2. Платная основа (Amber / Gold Theme)
- **Primary Accent Text:** `text-amber-600` (`#d97706`) / `dark:text-amber-400` (`#fbbf24`)
- **Strong Title Text:** `text-amber-800` / `dark:text-amber-300`
- **Soft Background Surface:** `bg-amber-50` / `dark:bg-amber-950/20`
- **Border Highlight:** `border-amber-200` / `dark:border-amber-900`
- **Solid Hero Card:** `bg-amber-600` (`#d97706`) / `dark:bg-amber-700`
- **Pass Zone Highlight:** `bg-amber-50/40` (`dark:bg-amber-950/20`), граница `border-b-amber-500`

### Semantic Status Colors
- **Success / Enrolled:** Emerald (`#059669` / `bg-emerald-500`, `text-emerald-700`) — подтвержденные договоры, зачисление, проходная зона.
- **Alert / Destructive:** Rose (`#e11d48` / `bg-rose-500`, `text-rose-400`) — отказы, ошибки загрузки, ненайденный абитуриент.
- **Pending / In Competition:** Slate Neutral (`bg-slate-100`, `text-slate-600`) — статус «в конкурсе».
- **Withdrawn / Cascade Pass:** Amber Accent (`bg-amber-50`, `text-amber-700`) — абитуриент выбыл на более высокий приоритет.

---

## Typography

Типографика построена на базе системного бесзасечного шрифта с добавлением табулированных моноширинных чисел (`tabular-nums font-mono`) для удобства быстрого сканирования строк и столбцов таблицы.

- **Primary Sans Font:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Numeric & Code Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing | Context Usage |
|------|------|--------|-------------|----------------|---------------|
| **Display Header** | 30px (3xl) / 36px (4xl) | 600 (Semibold) | 1.2 | -0.025em | Заголовок промо-баннера "Портал ранжирования" |
| **Hero Title** | 24px (2xl) / 30px (3xl) | 600 (Semibold) | 1.25 | -0.02em | Название специальности в карточке направления |
| **Section Title** | 18px (lg) / 20px (xl) | 600 (Semibold) | 1.3 | -0.015em | Заголовки секций, шапка приложения |
| **Metric Hero Number** | 30px (3xl) / 36px (4xl) | 600 (Semibold) | 1.0 | tabular-nums | Цифровые показания плашек (прогноз, согласие, конкурс) |
| **Body Primary** | 14px (sm) | 400 / 500 | 1.4 | normal | Текст колонок, модальные окна, фильтры |
| **Table Microcopy** | 12px (xs) | 400 / 500 / 600 | 1.3 | normal | Ячейки таблицы, бейджи мест, подписи |
| **Micro Tag / Label** | 11px / 10px | 600 (Semibold) | 1.2 | 0.05em uppercase | Категориальные плашки, верхний регистр меток |

---

## Spacing & Layout

Дизайн ориентирован на плотную подачу данных (compact data density) с возможностью комфортного чтения на смартфонах и распечатки на A4.

- **Page Shell Structure:** Верхний фиксированный Header (56px) + левый плавающий Sidebar (320px на Desktop) + Flex-1 основной контент-область.
- **Mobile Bottom Sheet:** Радиус верхних углов 16px (`rounded-t-2xl`), выезжающий снизу шторка-контейнер (`max-h-[85dvh]`) с индикатором перетаскивания (drag handle 40x4px).
- **Grid Gutters:** 16px (`gap-4`) в сетках метрик и таблиц; 12px (`gap-3`) в панелях фильтрации.
- **Section Gaps:** 24px (`mb-6`) между крупными аналитическими блоками.

### Border Radius Hierarchy (Squircle Philosophy)
- **Modals & Hero Cards:** `24px` (`rounded-3xl`)
- **Metric Cards & Table Containers:** `16px` (`rounded-2xl`)
- **Buttons, Inputs & Nav Items:** `12px` (`rounded-xl`)
- **Dropdown Popovers & Tabs:** `12px` (`rounded-xl` / `rounded-lg`)
- **Badges & Pill Labels:** `9999px` (`rounded-full`)

---

## Components System

### 1. Application Header & Theme Switcher
- **Layout:** Sticky на самом верху страницы, белая/темно-сланцевая плашка высотой ~56px с границей 1px снизу.
- **Theme Toggle:** Переключатель день/ночь в форме 40px иконной кнопки (`ghost`) с поворотной анимацией иконок Солнца/Луны (`Sun01Icon` / `MoonIcon`).

### 2. Sidebar & Mobile Bottom Sheet Drawer
- **Desktop:** Фиксированная панель слева шириной 320px (`w-80`), содержащая переключатель формы обучения (`Бюджет` / `Платное`), скроллируемый список направлений и навигационные кнопки режимов (`Моя позиция`, `Распределение`, `Конкурс по платному приёму`).
- **Mobile:** Респонсивный Bottom Sheet, приходящий снизу экрана с затемненным Backdrop (`bg-black/30 backdrop-blur-sm`).

### 3. Competition Hero Banner
- **Structure:** Крупная карточка (`rounded-3xl`, `p-8`) с цветной вертикальной полосой-акцентом слева (4px) и мягким размытым градиентным спотом на фоне (`blur-3xl`).
- **Right Hero Metric:** Выделенный счетчик мест с крупной цифрой (48px font-semibold tabular-nums) и иконкой формы зачисления.

### 4. Metric Stats Cards (4-Column Grid)
- **Standard Card:** Белый/темно-серый фон, тонкая рамка 1px, квадро-иконка 40x40px в soft-свете, серая метка капсом (11px font-semibold uppercase) и 30px цифра.
- **Highlighted Forecast Card:** Закрашенный фоновый прямоугольник акцентного цвета (`bg-teal-700` или `bg-amber-600`) с белым полупрозрачным геометрическим кругом на заднем плане и контрастным белым текстом.

### 5. PIN Code Input Component
- **Concept:** OTP-инпут из двух разделенных групп (3 цифры • 4 цифры) для удобного ввода 7-значных условных кодов.
- **Visuals:** Связанные ячейки с границами-разделителями (`divide-x`), подсвечиваемой активной ячейкой (`ring-2 ring-teal-500 bg-teal-50`) и пульсирующим каретным курсором `|`.
- **States:** 3-позиционная кнопка действия (Найти / Позиция найдена [зеленый] / Абитуриент не найден [красный]).

### 6. Dynamic Competition Table & Sticky Headers
- **Layout:** Обёртка в плоскую карточку `rounded-2xl border border-slate-200/80`.
- **Sticky Column:** Заголовки и первая колонка зафиксированы при горизонтальном скролле.
- **Last Budget Seat Indicator:** Нижняя граница толщиной 2px (`border-b-2 border-b-emerald-500` / `border-b-amber-500`) на последнем зачисляемом месте для наглядного отделения проходной зоны.

### 7. Distribution Matrix View
- **Concept:** Двумерная таблица распределения абитуриентов по диапазонам баллов (шаг в 10 баллов: 300-291, 290-281 и т.д.).
- **Passing Cell Highlight:** Ячейка, содержащая проходной балл, подсвечивается цветным круглым чипом (`rounded-full bg-teal-100 text-teal-700 font-semibold`) с выплывающим Tooltip по наведению.

### 8. Cascading Paid Admissions View (`PaidListsView`)
- **Concept:** Многопоточный расчет зачисления по 6 платно-договорным направлениям с учетом приоритетов заявления (1–5) и исключения зачисленных на бюджет.
- **Interactive Tooltip:** Клик на заменяющий статус «Выбыл на Пр. X» выводит плавающее меню со всеми выбранными направлениями абитуриента, его местами и баллами.

### 9. Filter Popover Dropdown
- **Design:** Компактная плашка 320px с затемняющей маской под ней. Позволяет оперативно переключать чекбоксы «Только проходящие», «Заключен договор», «Только с оплатой», «Без зачисленных на бюджет» со счетчиком активных фильтров.

### 10. Sync & Calculation Overlay
- **Visuals:** Полноэкранный полупрозрачный блюр-оверлей (`backdrop-blur-sm`) с анимированными концентрическими кольцами (`sync-ring`) и пульсирующими эквалайзер-столбиками (`sync-bar`), информирующими пользователя о каскадном расчете приоритетов.

---

## Print & Export Media Styles (A4 Standard)

Система включает законченный CSS-модуль печатных форм (`@media print`), оптимизированный для вывода официальных рейтинговых списков на печать или сохранения в PDF.

- **Page Layout:** A4 Portrait (`margin: 8mm 6mm`) по умолчанию; автоматический выбор A4 Landscape при включенном флаге `.print-landscape` для матрицы распределения.
- **Color Mode:** 100% высококонтрастный монохром (белый фон `#fff`, черный текст `#000`, явные границы таблиц `1px solid #000`).
- **Optimization:** Весь веб-интерфейс (шапка, сайдбар, кнопки, поиск) автоматически скрывается (`display: none` / `visibility: hidden`), оставляя только печатную область `#distribution-print-area` или `#paid-lists-print-area`.
- **Header Document:** Добавляется официальный шапочный заголовок («Филиал РГСУ в г. Минске • Приёмная комиссия 2026») с реквизитами направления и датой генерации.
- **Cell Shrinkage:** Размеры шрифта в таблице уплотняются до `9pt` (шапки столбцов диапазонов до `6.5pt`), запрещаются разрывы внутри строк (`page-break-inside: avoid`).

---

## Do's and Don'ts

### Do
- Соблюдать строгое цветовое разделение основы: Teal для `Бюджет`, Amber для `Платное`.
- Использовать скругления 24px (`rounded-3xl`) для hero-карточек и модалок, 16px (`rounded-2xl`) для таблиц и графиков, 12px (`rounded-xl`) для кнопок и полей.
- Применять моноширинный шрифт (`font-mono`) и табулированные числа (`tabular-nums`) для кодов СНИЛС/уникальных кодов и баллов.
- Выделять последнюю проходную строчку в рейтинге акцентной 2px нижней границей (`border-b-2`).
- Обеспечивать полноценную поддержку тёмной темы с эквивалентными контрастными сочетаниями Slate 900/950.
- Сохранять высокую плотность табличных данных без потери читаемости на мобильных устройствах за счет горизонтальной прокрутки с липкими колонками.

### Don't
- Не использовать тяжелые размытые тени на обычных элементах — иерархия строится на плашках и 1px микро-границ (`border-slate-200/80`).
- Не применять яркие случайные цвета (синий, фиолетовый) для ключевых действий — вся палитра строго распределена между Teal, Amber, Emerald, Rose и Slate.
- Не центрировать табличный текст текстовых наименований — названия направлений выравниваются строго по левому краю, а числовые данные — по центру или правому краю.
- Не перегружать печатные PDF-формы цветными фонами или иконками — при печати все плашки сбрасываются в прозрачный фон с четкой черной границей.

---

## Elevation & Surface Philosophy

В системе отсутствует традиционная многослойная глубина по Z-оси. Плоскость является базовым принципом:
- **Level 0 (Canvas):** Фон `bg-slate-50` / `dark:bg-slate-950`.
- **Level 1 (Card Surfaces):** Карточки `bg-white` / `dark:bg-slate-900` с хайрлайн-границей `border-slate-200/80`.
- **Level 2 (Overlay & Modals):** Модальные окна и всплывающие поповеры с эффектом размытия заднего плана (`backdrop-blur-sm bg-black/40`) и фокусной тенью `shadow-xl`.

---

## Imagery & Iconography

- **Icon Set:** Набор линейных векторных иконок Hugeicons (`hugeicons-react`) с толщиной штриха 1.25px–1.5px.
- **Icon Usage:** Иконки всегда заключаются в скругленный квадратный контейнер `w-10 h-10 rounded-xl` соответствующего soft-оттенка.
- **No Stock Imagery:** Приложение не использует абстрактные фото или декоративные иллюстрации — интерфейс ориентирован исключительно на работу с данными и графиками.

---

## Similar Systems & Design References

- **Linear App Analytics:** Контрастные тихие поверхности, строгая моноширинная типографика цифр, отсутствие лишнего декора.
- **Vercel Dashboard System:** Плоские карточки, тонкие границы 1px, тёмный/светлый режим с высокой контрастностью.
- **Apple iOS Design Guidelines:** Элементы скругления Squircle (`rounded-2xl`/`rounded-3xl`), нижняя выезжающая шторка Mobile Bottom Sheet.
