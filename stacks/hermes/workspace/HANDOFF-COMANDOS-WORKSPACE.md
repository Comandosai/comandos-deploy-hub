# COMANDOS Workspace handoff

Это брендированная COMANDOS/Hermes Workspace-панель, подготовленная как исходник для интеграции в one-click развёртывание Hermes.

## Что внутри

- COMANDOS-ребрендинг UI: логотипы, цвета, тексты, onboarding, dashboard/settings/screens.
- Реальные backend-связки с локальным Hermes:
  - `/api/local-hermes/status`
  - `integrations.localHermes` в `/api/integrations`
  - `start:all` поднимает `hermes gateway run` + `pnpm dev`
- Режим одной панели включён по умолчанию: пользователь открывает COMANDOS Workspace, родная Hermes dashboard не стартует.
- Защищённый update-flow: убран опасный `git reset --hard`, только fast-forward.
- `.env.example` дополнен `HERMES_CLI_PATH`.
- Отчёты:
  - `docs/comandos-workspace-integration-plan.md`
  - `docs/comandos-workspace-integration-report.md`

## Как запустить локально

```bash
pnpm install
pnpm build
pnpm dev
```

Для полного локального контура Hermes:

```bash
pnpm start:all
```

Если нужна старая родная панель Hermes для проверки совместимости:

```bash
pnpm start:legacy-dashboard
```

Ожидается установленный Hermes CLI в PATH или через env:

```bash
HERMES_CLI_PATH=/path/to/hermes
```

## Проверки на этой машине

- `pnpm build` — прошёл.
- local Hermes smoke для `detectLocalHermesStatus()` — прошёл.
- `pnpm test` — запустился, но упал на 18 уже существующих тестах в 7 suites; список и контекст в `docs/comandos-workspace-integration-report.md`.

## Как встроить в one-click installer

Минимальный сценарий для программиста:

1. Распаковать архив как source шаблон Workspace.
2. В installer после установки Hermes CLI добавить шаг установки Workspace:
   - `pnpm install`
   - `pnpm build`
   - создать `.env` из `.env.example`
   - прописать `COMANDOS_SINGLE_PANEL=1`
   - прописать `HERMES_CLI_PATH`, если Hermes не в PATH
   - запустить/зарегистрировать сервисы: `hermes gateway`, Workspace web/electron
3. Проверять readiness через:
   - Workspace: `/api/local-hermes/status`
   - Hermes gateway: `http://127.0.0.1:8642/health`
4. Не запускать one-click update на dirty checkout: update status должен блокировать грязные/дивергентные ветки.

Подробный порядок для будущего скилла: `docs/comandos-hermes-one-panel-installer.md`.

## Важно

Архив передаёт текущую дизайнерскую COMANDOS-версию как исходники. В него не включены `node_modules`, `.git`, build/cache artifacts и локальные `.env`/runtime-файлы.
