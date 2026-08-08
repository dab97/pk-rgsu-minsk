# Security Fix Tasks — pk-rgsu-minsk

Источник: аудит безопасности от 2026-08-08.

## Выполнено

### #3 [HIGH] ✅ Ограничение размера ответа, защита regex от ReDoS/OOM, rate limiting
_(ранее)_

### #5 [MED] ✅ Утечка error.message клиенту
- `server.ts` и `api/competition/[type]/[id].ts` — `error.message` больше не уходит клиенту. Добавлен маппинг на безопасные коды: `Upstream timeout` (504), `Upstream response too large` (502), `Upstream fetch failed` (502).

### #6 [MED] ✅ Security headers
- `server.ts` — `helmet` с HSTS, Referrer-Policy, frame-ancestors. CSP включается в production.
- `vercel.json` — глобальные headers для Vercel-деплоя: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS, Permissions-Policy, строгая CSP.

### #7 [MED] ✅ Санитизация логов
- Логируется только `kind` (TIMEOUT / TOO_LARGE / FETCH_FAILED) и `key`, без полного `error.message`. URL с id не утекает.

### #8 [MED] ✅ LRU-кэш
- `Map` заменён на `lru-cache` (`max: 500`, `ttlAutopurge: true`) в `server.ts` и `api/competition/[type]/[id].ts`. Лимит настраивается через `CACHE_MAX_ENTRIES`.

### #9 [MED] ✅ api-proxy.php curl-флаги
_(ранее)_

### #1 [HIGH] ✅ npm audit CVE
_(ранее)_

### #2 [HIGH] ✅ Валидация входных параметров в API (SSRF/path traversal)
- Добавлены экспортируемые функции в `shared/parser.ts`: `isValidType`, `isValidId`, `buildSafeRgsuUrl(type, id)`.
- `server.ts` и `api/competition/[type]/[id].ts` используют единый валидатор: regex `^[A-Za-z0-9_\-]{1,256}$` + проверка `hostname === 'pk.rgsu.net'` через `new URL()`.
- Добавлены unit-тесты (`shared/parser.test.ts`): 5 новых кейсов (safe/dangerous ids, type whitelist, happy path, edge cases).
- **Итог:** 44/44 тестов ✅, `tsc --noEmit` ✅, `vite build` ✅.

---

## 📋 Все задачи аудита выполнены

Итоговый отчёт записан в `README.md` → секция **«Безопасность»**. Все 9 задач закрыты, 44/44 тестов проходят, `tsc --noEmit` чист, `vite build` OK.
