# Comandos Deploy Hub

Репозиторий с шаблонами развёртывания и навыками Comandos.

## Быстрый старт для агента

1. Посмотри доступные навыки:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- list
```

2. Установи нужный навык:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install polnyy-zapusk-otdela-prodazh --client codex
```

3. После установки агент открывает файл инструкций под клиента:
- `AGENTS.md` (Codex)
- `CLAUDE.md` (Claude)
- `GEMINI.md` (Gemini)
- если такого файла нет, берёт `SKILL.md`

Пример с Gemini:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install telegram-testirovanie-bota --client gemini
```

По умолчанию навыки ставятся в `~/.codex/skills`.
Поддерживаемые клиенты: `codex`, `claude`, `gemini`, `antigravity`, `terminal`.

Подробный список: [SKILLS.md](SKILLS.md)
Правила для агента: [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md)

Полный пакет CyberSEO ставится из `main` командой:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install cyberseo-full --client codex
```

## Быстрый старт для Telegram-парсера

Чтобы скачать учебную заготовку, установить зависимости и сразу пройти вход в Telegram:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash
```

Скрипт создаст папку `telegram-parser-starter`, положит туда проект, запустит `setup.sh` и откроет авторизацию.
Телефон вводится в международном формате, например `+78001234567`.

Если нужно только скачать и подготовить проект без авторизации:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash -s -- --no-auth
```

Подробности: [STARTERS.md](STARTERS.md)

## Быстрый старт для WordPress

Чтобы развернуть WordPress со всеми оптимизациями:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/wp/setup.sh | bash
```

## Быстрый старт для COMANDOS Hermes

Пользователь создаёт папку `Hermes`, открывает её в агенте и запускает:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

После этого заполняет `comandos-hermes.env` и запускает:

```bash
./deploy.sh
```

Лицензионный ключ вводится уже в веб-панели при входе.

## Структура репозитория

- `stacks/` — только стеки развёртывания:
  - `stacks/n8n/`
  - `stacks/hermes/`
  - `stacks/supabase/`
  - `stacks/wp/`
- `skills/units/` — одиночные навыки.
- `skills/bundles/` — наборы навыков.
- `starters/` — готовые учебные заготовки проектов.
- `registry/skills-index.json` — единый список навыков, наборов и зависимостей.
- `tools/skills.sh` — установка навыка или набора одной командой.
- `tools/telegram-parser.sh` — установка Telegram-парсера одной командой.
- `tools/check.sh` — обязательная проверка структуры перед push.
- `STACK_STANDARD.md` — обязательный стандарт для новых стеков.
- `AGENT_WORKFLOW.md` — как агент должен выбирать и запускать навыки.

Главное правило: старые пути не ломаем. Новые навыки добавляем через реестр `registry/skills-index.json`.
Starter-проекты не являются навыками и не добавляются в `registry/skills-index.json`.
