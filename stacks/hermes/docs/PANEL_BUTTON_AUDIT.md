# Аудит кнопок COMANDOS Hermes Workspace

Дата обновления: 2026-06-05

## Цель

Довести панель COMANDOS Hermes Workspace до состояния, где каждое видимое действие:

- работает;
- или честно отключено с понятным русским объяснением;
- или скрыто до готовности функции.

Проверка идёт как у обычного пользователя: открыть раздел, нажать кнопку, посмотреть интерфейс, проверить browser console/network, при необходимости проверить серверный обработчик, исправить причину и повторить нажатие.

## Статусы

- `OK` — проверено, работает.
- `FIXED` — была ошибка, исправлено и перепроверено.
- `DISABLED` — функция недоступна, но интерфейс объясняет это по-русски.
- `HIDDEN` — функция убрана до готовности.
- `TODO` — ещё нужен живой VPS/gateway или отдельная коробочная проверка.

## Среда проверки

- Локальная панель: `http://127.0.0.1:33030`
- Живая тестовая панель: `https://194.113.38.109.nip.io`
- Ветка: `codex/product-button-audit`
- Проверка маршрутов: Playwright Chromium, чистые контексты, `claude-onboarding-complete=true`
- Локальный Hermes gateway: не поднят. Разделы, зависящие от gateway, проверялись на честное русское disabled-состояние.
- Живой Hermes gateway на `clawd`: доступен через `127.0.0.1:8642`, workspace через `127.0.0.1:3030`, сервисы `comandos-workspace`, `hermes-gateway`, `comandos-telegram` активны как user services.

## Исправленные дефекты

| Раздел | Проблема | Исправление | Перепроверка | Статус |
| --- | --- | --- | --- | --- |
| Задачи | У карточки задачи не было реального удаления | Добавлен backend DELETE для задач/kanban и кнопка `Удалить` в форме редактирования | Создание, редактирование, удаление временной задачи через UI и API | FIXED |
| Профили | Базовый профиль можно было пытаться переименовать | Для `default` переименование отключено, tooltip объясняет причину | `default` показывает disabled `Переименовать`; временный профиль создаётся/переименовывается/активируется/удаляется | FIXED |
| Импорт из ClawBot | Пользователь не понимал, что именно запускается | Проверен сценарий: кнопка открывает чат и вставляет промпт мигратора без копирования секретов | `/profiles` -> `Импорт из ClawBot` -> `/chat/main`, промпт виден | OK |
| OpenAI Codex | Показывался ложный OAuth-сценарий | Codex описан как `CLI-вход`; OAuth/API Key для него отключены | `/settings` и `/settings/providers`: нет `Start OAuth`, нет `OAuth device flow not supported` | FIXED |
| OpenAI Codex | В CLI-сценарии не было явной кнопки перехода к проверке, а часть текста оставалась на английском | Добавлена кнопка `Перейти к проверке`; видимые подписи `API Key`, `API keys are stored locally`, `Show/Hide manual config snippet` русифицированы | `clawd` обновлён до `.17`; Playwright прошёл `Добавить провайдера → OpenAI Codex → CLI-вход → Перейти к проверке` без console/network ошибок | FIXED |
| Лицензия | Ошибки вроде `License key required` показывались по-английски | Ошибки лицензии нормализованы в русские сообщения | Mock-проверка экрана лицензии: до ввода ошибки нет, после пустой активации русское сообщение | FIXED |
| Терминал | Кнопка AI-анализа ходила в несуществующий `/api/debug-analyze` | Добавлен локальный безопасный обработчик анализа терминального вывода | Кнопка `AI-анализ терминала` показывает русскую диагностику без 404/500 | FIXED |
| Терминал | Кнопка новой вкладки требовала проверки | Проверено создание второй вкладки | После клика виден `Терминал 2`, ошибок нет | OK |
| Терминал | При переходах и закрытых PTY-сессиях `/api/terminal-resize` и `/api/terminal-input` могли давать 404/502 в browser console | Устаревшие terminal session теперь отвечают мягко: resize — `ok=true, attached=false`, input — `ok=false, attached=false`, без HTTP-ошибки | `clawd` обновлён до `.17`; прямые POST к stale session вернули 200, свежие логи без новых ошибок | FIXED |
| Терминал | При длинном проходе по меню после `/terminal` на `.18` снова появились 502 на `/api/terminal-resize`/`/api/terminal-stream`, а в логах — `MaxListenersExceededWarning` | TerminalWorkspace теперь не инициализирует PTY и не resize-ит терминал, пока раздел скрыт; при уходе со страницы отменяет stream-reader, а при возврате переподключается к существующей PTY | `clawd` обновлён до `.19`; live-обход 14 пунктов меню после `/terminal` прошёл без console errors, HTTP 4xx/5xx и новых `MaxListenersExceededWarning` | FIXED |
| Файлы | Нужно было проверить реальные действия файлов | Проверены новый файл, редактирование, сохранение, upload, context menu, download item, delete | Временный файл создан, сохранён и удалён, ошибок нет | OK |
| Dashboard / Settings | Оставались английские пользовательские подписи | Русифицированы видимые подписи, tooltip и статусы провайдеров | Маршрутный обход не нашёл `Key required`, `Key set`, `Start OAuth`, `Usage trend`, `No analytics usage` | FIXED |
| Gateway-зависимые разделы | Сообщения о недоступной серверной части были частично английскими | Русифицированы сообщения возможностей gateway | `/jobs`, `/mcp` показывают понятное объяснение, что нужен Hermes Agent gateway | FIXED |
| Обновления | После пуша версия manifest могла не измениться или raw GitHub мог отдать старый кэш | Workspace поднят до `2.3.0-comandos.11`; update checker сначала превращает `main` в конкретный SHA через `git ls-remote` | Raw manifest по SHA отдаёт `.11`; `update-system` тесты проходят | FIXED |
| Обновления | Крестик в карточке обновления скрывал конкретную версию навсегда в `localStorage` | Workspace поднят до `2.3.0-comandos.12`; скрытие теперь действует 24 часа, старые вечные маркеры игнорируются | `update-center-notifier` тесты проходят; `clawd` API показал `2.3.0-comandos.7 → 2.3.0-comandos.11` до фикса | FIXED |
| Обновления | Кнопка обновления успевала перезапустить панель до ответа API; state записывал старую версию из lock | `comandos-hermes.lock` поднят до `2.3.0-comandos.12`; restart delay вынесен в `COMANDOS_WORKSPACE_RESTART_DELAY_SECONDS` с дефолтом 30 сек; отложенный restart отсоединён через `nohup` | На `clawd` повторный API-вызов вернул JSON `ok=true`; после отложенного рестарта служба активна, installed state `.12`, update status `current` | FIXED |
| Обновления | После правки установщика без bump версии установленная панель не увидела бы обновление | Workspace поднят до `2.3.0-comandos.13`, manifest/lock/package синхронизированы | `clawd`: status показал `.12 → .13`, POST `/api/update/workspace` вернул `ok=true`, после рестарта services active, update status `current` | FIXED |
| Установка | В уроке пользователь мог заполнить `comandos-hermes.env.example`, а агент дальше проверял пустой `comandos-hermes.env` | Workspace поднят до `2.3.0-comandos.13`; `deploy.sh` берёт заполненный example, если основной env не проходит проверку; тексты урока обновлены | Чистая установка из GitHub отдаёт новые тексты; изолированный fake-SSH прогон: основной env падает, example проходит, deploy выбирает example | FIXED |
| Задачи | На чистом VPS может отсутствовать системный `sqlite3`, из-за чего backend задач пишет `spawnSync sqlite3 ENOENT` | Workspace поднят до `2.3.0-comandos.15`; `deploy.sh` ставит `sqlite3`, update script доставляет его на уже установленной панели, а backend временно уходит на локальную доску, если зависимость ещё отсутствует | `bash -n` для install/update scripts OK; `kanban-backend` тест добавлен для fallback без `sqlite3`; `clawd` обновлён до `.15`, tasks API не падает | FIXED |
| Панель агента | Справа показывался пустой и ложный `OpenAI`, хотя активная модель — `deepseek-chat` | Workspace поднят до `2.3.0-comandos.16`; панель агента теперь берёт модель из `/api/claude-config`, а провайдер расхода выбирает только при наличии реальных progress-строк | Тест `agent-usage-helpers` проверяет, что badge-only OpenAI не выбирается; `pnpm build` OK | FIXED |
| Обновления | Модалка показывала урезанную версию `2.3.0-c → main` и могла всплывать от старых pending notes при обычном открытии | Workspace поднят до `2.3.0-comandos.16`; версии больше не режутся как SHA, managed release notes пишут версию вместо `main`, старые notes нормализуются и не открываются сами на routine status poll | Тесты `update-center-notifier` и `update-system` проверяют формат версий и нормализацию `main → 2.3.0-comandos.*`; `pnpm build` OK | FIXED |
| Навыки | Кнопки `Установить`, `Удалить` и toggle выглядели активными, хотя текущий managed/zero-fork API не поддерживал эти действия; прямой вызов установки мог вернуть техническую ошибку JSON-парсинга | Workspace поднят до `2.3.0-comandos.20`; `/api/skills` отдаёт `actions`, UI отключает недоступные действия с русским объяснением, direct install/uninstall/toggle возвращают управляемые русские 501 | `clawd` обновлён до `.20`; `/api/skills` вернул `install/uninstall/toggle=false`; прямые install/toggle вернули русские 501; Playwright `/skills` не нашёл активных `Установить/Удалить`, console/network чистые | FIXED |

## Проверенные маршруты

| Раздел | URL | Итог | Статус |
| --- | --- | --- | --- |
| Панель | `/dashboard` | Открывается, кнопки верхнего уровня видны, ошибок нет | OK |
| Новый чат | `/chat/new` | Открывается, поле ввода доступно, отправка отключена при пустом сообщении | OK |
| Существующий чат | `/chat/main` | Открывается, кнопка `Новая сессия` переводит в `/chat/new` | OK |
| Файлы | `/files` | Открывается, действия файлов работают | OK |
| Терминал | `/terminal` | Открывается, вкладки и AI-анализ работают | FIXED |
| Задания | `/jobs` | При недоступном gateway показывает русское disabled-состояние | DISABLED |
| Задачи | `/tasks` | Создание/редактирование/удаление задач работает | FIXED |
| Оркестратор | `/conductor` | Основные кнопки и модальные окна открываются без ошибок | OK |
| Операции | `/operations` | Вкладки и создание агента открываются без ошибок | OK |
| Рой | `/swarm` | Вкладки, настройки, добавление агента и навигация панелей работают | OK |
| Память | `/memory` | Вкладки `Память` и `База знаний` работают, пустое состояние понятно | OK |
| Навыки | `/skills` | Вкладки, фильтры и pagination-состояния работают | OK |
| Навыки | `/skills` | Недоступные install/uninstall/toggle действия честно disabled с русским объяснением | FIXED |
| MCP | `/mcp` | При недоступном gateway показывает русское disabled-состояние | DISABLED |
| Профили | `/profiles` | Импорт, создание, детали, ограничения default-профиля проверены | FIXED |
| Настройки | `/settings` | Вкладки и основные действия открываются без пользовательского английского мусора | FIXED |
| Провайдеры | `/settings/providers` | Codex CLI-сценарий и добавление провайдера проверены | FIXED |
| HermesWorld | `/playground` | Открывается из меню без ошибок | OK |

## Проверенные кнопки и действия

| Где | Действие | Ожидание | Итог |
| --- | --- | --- | --- |
| Сайдбар | Логотип, новая сессия, чат, панель, файлы, терминал, задачи, оркестратор, операции, рой, память, навыки, MCP, профили | Переход на нужный маршрут | OK |
| Сайдбар | `Поиск` | Открыть поиск | OK |
| Сайдбар | `Свернуть меню` | Свернуть/развернуть меню | OK |
| Сайдбар | `Пользователь` | Открыть меню пользователя | OK |
| Сайдбар | `Настройки` | Открыть `/settings` | OK |
| Chat | `Показать файлы` / `Скрыть файлы` | Переключить файловую панель | OK |
| Chat | `Аудит рабочей папки` | Подставить готовый промпт в composer | OK |
| Chat | `Записать правило в память` | Подставить готовый промпт в composer | OK |
| Chat | `Создать файл` | Подставить готовый промпт в composer | OK |
| Chat | `Настройки чата` | Открыть настройки текущей сессии | OK |
| Chat | `Голосовой ввод` | Не падать без микрофона/разрешения браузера | OK |
| Chat | `Голосовой ввод` / длинное нажатие микрофона | Ошибки микрофона/STT показываются по-русски без сырого ответа провайдера | FIXED |
| Agent panel | Индикатор модели и расхода | Не показывать пустой `OpenAI`, если у него нет данных расхода | FIXED |
| Files | `Новый файл`, `Загрузить`, сохранить, preview, context menu, удалить | Работа с временным файлом | OK |
| Terminal | `Новая вкладка терминала` | Создать вкладку | OK |
| Terminal | `AI-анализ терминала` | Показать русскую диагностику | FIXED |
| Tasks | `Новая задача`, edit, save, delete | Полный цикл карточки | FIXED |
| Profiles | `Импорт из ClawBot` | Открыть чат с промптом мигратора | OK |
| Profiles | `Создать профиль`, rename, activate, delete | Полный цикл временного профиля | OK |
| Profiles | `Переименовать` у `default` | Disabled с объяснением | DISABLED |
| Settings | Вкладки модель/агент/голос/экран/тема/чат/сигналы/язык | Переключаются без ошибок | OK |
| Settings | `Показать запасную модель`, `Сохранить модель`, добавление ключа, custom provider validation | Не падают, показывают понятное состояние | OK |
| Providers | `Добавить провайдера` -> `OpenAI Codex` | Показывать только CLI-вход, без ложного OAuth | FIXED |
| Providers | `OpenAI Codex` -> `CLI-вход` -> `Перейти к проверке` | Перевести пользователя к проверке CLI-входа без OAuth и английских ошибок | FIXED |
| Skills | `Установить`, `Удалить`, toggle включения | В managed/zero-fork режиме действия недоступны и не должны выглядеть рабочими | FIXED |
| Updates | `Скрыть обновление Hermes Agent` | Убрать карточку обновления | OK |

## Автоматические проверки

| Команда | Результат | Примечание |
| --- | --- | --- |
| `git diff --check` | OK | Пробельных ошибок нет |
| `pnpm exec vitest run src/server/license.test.ts src/server/update-system.test.ts src/server/claude-tasks-backend.test.ts src/server/kanban-backend.test.ts src/server/hermes-config-migration.test.ts src/components/settings-dialog/settings-dialog.test.ts` | OK | 23 теста прошли |
| `pnpm build` | OK | Есть только предупреждения Vite про размер чанков и смешанные dynamic/static imports |
| `pnpm exec vitest run src/server/update-system.test.ts` после bump/cache fix | OK | Проверка сравнения версий и настроек polling |
| `pnpm exec vitest run src/components/update-center-notifier.test.ts src/server/update-system.test.ts` | OK | 5 тестов прошли; проверены временное скрытие обновлений и сравнение версий |
| `pnpm exec vitest run src/components/agent-view/agent-usage-helpers.test.ts src/components/update-center-notifier.test.ts src/server/update-system.test.ts` | OK | 12 тестов прошли; проверены выбор провайдера расхода, формат версий и managed release notes |
| `pnpm exec vitest run src/routes/api/-terminal-session-lifecycle.test.ts src/components/settings-dialog/settings-dialog.test.ts src/components/update-center-notifier.test.ts src/server/update-system.test.ts` | OK | 14 тестов прошли; проверены stale terminal API, настройки, обновления и формат версий |
| `pnpm exec vitest run src/routes/api/-terminal-session-lifecycle.test.ts` | OK | 4 теста прошли; проверены stale resize/input и cleanup listeners при terminal stream close/abort |
| `pnpm exec eslint src/components/agent-view/agent-usage-helpers.ts src/components/agent-view/agent-usage-helpers.test.ts src/components/update-center-notifier.tsx src/components/update-center-notifier.test.ts src/server/update-system.test.ts` | OK | Новая логика и тесты проходят; полный `agent-view-panel.tsx` всё ещё имеет старый lint-долг |
| `pnpm exec eslint src/routes/api/terminal-resize.ts src/routes/api/terminal-input.ts src/routes/api/-terminal-session-lifecycle.test.ts src/screens/settings/components/provider-wizard.tsx` | OK | Затронутые файлы проходят lint; есть только старое предупреждение про `.eslintignore` |
| Маршрутный Playwright-обход 17 страниц | OK | Нет аварийных экранов, console errors, сетевых падений и проверяемых английских пользовательских фраз |
| Live Playwright: `/settings/providers` -> `OpenAI Codex` -> `CLI-вход` -> `Перейти к проверке` на `.17` | OK | Нет `Start OAuth`, `OAuth device flow not supported`, `Key required`, старых английских подсказок, console errors и HTTP 4xx/5xx |
| Live API: stale `/api/terminal-resize` и `/api/terminal-input` на `.17` | OK | Оба endpoint вернули HTTP 200; resize `ok=true`, input `ok=false`, оба `attached=false` |
| Live Playwright: `/terminal` -> 14 пунктов бокового меню на `.19` | OK | Все клики сработали; пустых/аварийных экранов нет; terminal API не дал 4xx/5xx; browser console чистая; systemd-логи без новых terminal ошибок и `MaxListenersExceededWarning` |
| Live API + Playwright: `/skills` на `.20` | OK | `/api/skills` отдаёт `actions`; direct install/toggle дают русские 501; UI показывает предупреждение и disabled-кнопки `Недоступно`/`Удаление недоступно`; активных install/uninstall кнопок, console errors и HTTP 4xx/5xx в UI-проходе нет |
| `pnpm exec vitest run src/server/stt-transcription.test.ts` | OK | 4 теста прошли; проверены STT-настройки и русская ошибка отсутствующего ключа Groq |
| `pnpm exec eslint src/lib/voice-errors.ts src/hooks/use-voice-input.ts src/hooks/use-voice-recorder.ts src/screens/chat/components/chat-composer.tsx src/routes/api/transcribe.ts src/server/stt-transcription.ts src/server/stt-transcription.test.ts` | OK | Ошибок нет; остались старые `no-shadow` warnings в `chat-composer.tsx` |
| `pnpm exec vitest run src/server/update-system.test.ts` | OK | Проверена нормализация release notes: устаревший переход `.19 -> .20` не должен всплывать, если реально доступно `.20 -> .22` |
| Live API: `/api/update/workspace` на `clawd` `.20 -> .22` | OK | Обновление применилось; release notes вернули актуальный переход `.20 -> .22`; `comandos-workspace.service` active; повторный `/api/update/status` показывает Workspace `.22`, `updateAvailable=false` |
| Поиск секретов в diff | OK | API-ключи, Telegram-токены, пароли, private key не найдены |

## Что ещё требует живой коробочной проверки

| Область | Почему ещё TODO |
| --- | --- |
| Чистая установка из GitHub | Нужен отдельный прогон `install.sh` -> env -> `deploy.sh` на VPS |
| Вход по реальной лицензии | Локально проверен UI и нормализация ошибок; реальная лицензия проверяется на установленной панели |
| Первый реальный чат | Нужен поднятый gateway и ключ модели на VPS |
| Задания cron | Локально gateway недоступен, поэтому проверено только честное disabled-состояние |
| MCP с реальным gateway | Локально gateway недоступен, поэтому проверено только честное disabled-состояние |
| Обновление Hermes Agent при новой версии | На `clawd` Hermes Agent сейчас `current`; нужно повторить кнопку, когда manifest будет указывать более новую проверенную версию агента |
| Telegram router / голос / inline-кнопки | Нужен VPS с Telegram-токеном и живым ботом |
| Полный eslint большого `agent-view-panel.tsx` | Файл содержит старые замечания lint: отсутствующее правило `react-hooks/exhaustive-deps`, старые optional-chain/assertion места и shadow warnings. Сборка проходит, но перед финальной продажей это надо вынести в отдельную чистку. |

## Текущий вывод

Локальная и живая тестовая панель стали существенно ближе к коробочному состоянию: основные разделы открываются, мёртвые кнопки из найденного прохода исправлены или честно отключены, ложный OAuth для Codex убран, пользовательские ошибки лицензии и gateway русифицированы, ложный `OpenAI` в панели агента и кривые версии обновлений исправлены.

Следующий обязательный шаг перед продажей и видео: чистая установка на VPS из GitHub и повтор тех же проверок уже на установленной панели.
