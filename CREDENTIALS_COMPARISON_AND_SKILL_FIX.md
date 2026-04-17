# Сравнительный анализ credentials (старые vs новые) и обязательные правки skill

Дата аудита: 2026-04-17
Проект: COMANDOS (`https://n8n.automation-hub.online`)

## 1) Зачем этот документ

Документ фиксирует:
- чем отличаются новые credentials, созданные через UI, от старых;
- какие отличия нормальны и допустимы (включая `null`/пустые поля);
- что именно нужно поменять в skill-документации и правилах, чтобы сборка и проверка не ломались на валидных UI-credential;
- как безопасно перейти на новые credentials и удалить старые.

## 2) Ключевой вывод

Критический вывод: длина/формат `credential.id` не является проблемой.

В текущем `n8n` одновременно валидны оба формата:
- UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- короткий opaque ID (например `zh3cZd8jbffxnnX4`)

Подтверждение runtime:
- `01_Ingress_Channel_Intake` публикуется/активируется на новых short-id.
- `02_Main_Orcestrator` публикуется/активируется на новых short-id.

Следовательно, правило `UUID-only` в skill — неверное и должно быть удалено.

## 3) Инвентарь credentials (актуальный снимок)

### По типам

- `openAiApi`:
  - старый: `OpenAI` (`3b8dfe23-1c4a-48fa-91eb-b8a9d35f2101`)
  - новый: `OpenAi account test` (`zh3cZd8jbffxnnX4`)
- `openRouterApi`:
  - старый: `OpenRouter` (`7c204e7f-558e-4a42-8a8b-5ced8eb737f2`)
  - новый: `OpenRouter account` (`jWyuIm0ARPrvqpEc`)
- `postgres`:
  - старый: `Postgres` (`bd4f4726-739a-4dc0-8a54-a72ea7f7b527`)
  - новый: `Postgres account test` (`hjP3dMXaOzdxiVM1`)
- `supabaseApi`:
  - старый: `Supabase` (`6f2d7c93-3f3f-47d8-905a-9ccbf8646f3b`)
  - новый: `Supabase account test` (`6RSvlYKiyTsV8CRr`)
- `telegramApi`:
  - старые: `Telegram Sales Bot` (`c8bcbf90-5dd2-4f22-a2ad-f633c0d2068f`), `Telegram Error Bot` (`ef4ed2c4-153d-41ad-abd0-a568597dc31f`)
  - новые: `Продажник` (`9fSLLVxB1W20loMs`), `Ошибка` (`Jv4o8dIkgLNVj8h4`)
- `comandosLsiKeysApi`:
  - старый: `Comandos LSI` (`f6ac86ab-78f2-46fb-b2f0-c2ee4f380666`)
  - новый: `Comandos LSI Keys account test` (`4lUDMuAL0saREDh3`)
- `httpMultipleHeadersAuth`:
  - старые: `MCP Postgres` (`2bc98ca6-8104-4d3f-bc65-f92f59ea36f0`), `MCP AmoCRM` (`703e771f-c505-4291-b444-66ec051ca73a`)
  - новые: `MCP postgress  test` (`viPR7jHklL2fsSyi`), `AMO test` (`sx943yTBndYNsskt`)

## 4) Точные различия по полям `data`

Ниже только подтвержденные отличия из API (`includeData=true`).

### 4.1 `openAiApi`: `OpenAI` vs `OpenAi account test`

Отличается:
- `header`: `false` vs `null`
- `headerName`: `""` vs `null`
- `headerValue`: `"__n8n_EMPTY_VALUE..."` vs `null`
- `organizationId`: `""` vs `null`
- `url`: `"https://api.openai.com/v1"` vs `null`

Интерпретация:
- UI-credential может хранить эти поля как `null` и это валидно, если runtime publish/activate проходит.

### 4.2 `openRouterApi`: `OpenRouter` vs `OpenRouter account`

Отличается:
- `url`: `"https://openrouter.ai/api/v1"` vs `null`

Интерпретация:
- `null` в `url` для нового UI-созданного credential не является автоматической ошибкой.

### 4.3 `postgres`: `Postgres` vs `Postgres account test`

Отличается:
- `allowUnauthorizedCerts`: `false` vs `null`
- `database`: `"postgres"` vs `null`
- `maxConnections`: `100` vs `null`
- `port`: `5432` vs `null`
- `ssl`: `"disable"` vs `null`

Интерпретация:
- UI может не заполнять часть non-secret полей как явные значения.
- валидность нужно проверять не по non-null, а по runtime.

### 4.4 `supabaseApi`: `Supabase` vs `Supabase account test`

Отличия: нет (по видимой части `data`).

### 4.5 `comandosLsiKeysApi`: `Comandos LSI` vs `Comandos LSI Keys account test`

Отличия: нет (по видимой части `data`).

### 4.6 `telegramApi`: `Telegram Sales Bot` vs `Продажник`

Отличается:
- `baseUrl`: `"https://api.telegram.org"` vs `null`

### 4.7 `telegramApi`: `Telegram Error Bot` vs `Ошибка`

Отличается:
- `baseUrl`: `"https://api.telegram.org"` vs `null`

Интерпретация для Telegram:
- `baseUrl=null` в UI-credential может быть валиден.

### 4.8 `httpMultipleHeadersAuth`: `MCP Postgres` vs `MCP postgress  test`

Отличается блок `headers.values`:
- в новом есть дополнительный header `tenant_id`;
- остальные обязательные header-поля совпадают.

Интерпретация:
- skill должен допускать оба валидных профиля:
  - базовый набор;
  - расширенный набор с `tenant_id`.

### 4.9 `httpMultipleHeadersAuth`: `MCP AmoCRM` vs `AMO test`

Отличия: нет (по видимой части `data`).

## 5) Runtime-подтверждение

- `01_Ingress_Channel_Intake` активируется с новыми credential (short-id).
- `02_Main_Orcestrator` активируется с новыми credential (short-id).
- `03_WF_Qualification` активен.
- `04_WF_Consultation` активен.
- `06_WF_Test` выключен.
- `05_WF_Human_Handoff_Workflow` не активирован, потому что в нем не выполнена полная миграция credential на новые (по договоренности).

## 6) Что именно править в skill (обязательно)

Ниже конкретные правки по документам skill.

### 6.1 Удалить правило `UUID-only`

Заменить везде формулировки вида:
- `credentials должны иметь UUID v4`

На:
- `credential.id считается валидным, если он непустой и принят текущим n8n runtime; формат/длина (UUID или short-id) не нормируются skill-ом`.

Файлы:
- `skills/podklyuchenie-otdela-prodazh/SKILL.md`
- `skills/podklyuchenie-otdela-prodazh/README.md`
- `skills/podklyuchenie-otdela-prodazh/references/dostupy-i-klyuchi.md`
- `skills/podklyuchenie-otdela-prodazh/references/poryadok-deystviy.md`
- `skills/podklyuchenie-otdela-prodazh/references/runtime-readiness.md`
- `skills/podklyuchenie-otdela-prodazh/references/audit-pereprivyazki.md`

### 6.2 Убрать ложную валидацию `null` как ошибки

Добавить явное правило:
- `null`/пустые значения в non-secret полях (`url`, `baseUrl`, `organizationId`, `headerName`, `maxConnections`, `ssl`, `port`, и т.д.) сами по себе не являются blocker, если workflow publish/activate проходит и node runtime работает.

### 6.3 Валидация должна быть runtime-first

В `Runtime readiness` и `Audit` закрепить критерии готовности:
1. у каждого node есть `credentials[type].id`;
2. `publish`/`activate` проходит;
3. отсутствуют runtime ошибки `Credential not configured` / `Authorization failed`;
4. smoke-test на целевых workflow успешен.

### 6.4 Обновить правило по `MCP Postgres` headers

Сделать правило:
- обязательные header-ключи должны присутствовать;
- дополнительный `tenant_id` допустим;
- skill не должен считать это несовместимостью.

### 6.5 Не принуждать ручной reformat UI-credential

Добавить:
- если credential создан через UI и успешно проходит runtime, skill не должен переписывать его структуру под старый JSON-шаблон.

## 7) Рекомендуемый migration-порядок перед удалением старых credentials

1. Довести `05_WF_Human_Handoff_Workflow` до полной привязки на новые credentials.
2. Проверить publish/activate всех `01..05` и выключенный `06`.
3. Прогнать smoke-test.
4. Только потом удалить старые credentials, которые больше не используются ни в одном workflow.

Критично: удалять старые credentials только после `usage audit = 0` по их `id`.

## 8) Что исправлять в skill-тексте прямо сейчас (кратко)

Нужно зафиксировать 4 новых инварианта:
- `ID opaque`: ID не валидируем по длине/UUID-формату.
- `UI parity`: принимаем UI-форму credential как норму.
- `Runtime over shape`: publish/activate важнее non-null полей в `data`.
- `MCP headers flexible`: поддержка расширенного набора (`tenant_id` допустим).

---

Если этот документ утвержден, следующий шаг — выполнить controlled migration:
- перепривязать `05` на новые `id`;
- прогнать publish/activate;
- сделать автоматический usage-аудит;
- удалить все старые credentials с нулевым usage.
