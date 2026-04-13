# Codex Install Notes

Рекомендуемая команда пользователю:

```text
Подключи COMANDOS Vector Ingestion Bundle, установи локальные skills и подготовь workspace для document split и vector ingestion.
```

Дальше агент должен:

1. использовать `doc-splitter-launcher`;
2. затем использовать `vector-ingestion-launcher`;
3. вести пользователя только по текущему runtime-сценарию.
