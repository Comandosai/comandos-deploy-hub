# Каталог навыков

Ниже список того, что можно поставить одной командой.

## Набор (полный сценарий)

- `polnyy-zapusk-otdela-prodazh` — полный запуск отдела продаж (ставится вместе с зависимостями).

Команда:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install polnyy-zapusk-otdela-prodazh --client codex
```

## Отдельные навыки

- `razvertyvanie-i-obnovlenie-n8n` — развёртывание и обновление n8n.
- `vektorizaciya-i-zagruzka-bazy` — подготовка и загрузка базы знаний.
- `podklyuchenie-otdela-prodazh` — подключение отдела продаж.
- `telegram-testirovanie-bota` — живое тестирование Telegram-бота.
- `sborka-brifa` — сборка брифа.
- `prompt-kvalifikatora` — сборка промпта квалификатора.
- `prompt-konsultanta` — сборка промпта консультанта.

Шаблон команды:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install <skill_id> --client <codex|claude|gemini>
```

Пример:
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install telegram-testirovanie-bota --client claude
```

## Служебные элементы

- `prompt-architecture` — библиотека стандартов промптов. Обычно ставится как зависимость автоматически.
