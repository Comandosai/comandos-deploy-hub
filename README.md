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

## Быстрый старт для WordPress

Чтобы развернуть WordPress со всеми оптимизациями:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack/setup.sh | bash
```

## Структура репозитория

- `skills/` — навыки и наборы навыков.
- `registry/skills-index.json` — единый список навыков, наборов и зависимостей.
- `tools/skills.sh` — установка навыка или набора одной командой.
- `STACK_STANDARD.md` — обязательный стандарт для новых стеков.
- `AGENT_WORKFLOW.md` — как агент должен выбирать и запускать навыки.
- `n8n-stack-v2/`, `n8n-stack/`, `supabase-stack/`, `wp-stack/`, `wp-next-stack/` — шаблоны развёртывания.

Главное правило: старые пути не ломаем. Новые навыки добавляем через реестр `registry/skills-index.json`.
