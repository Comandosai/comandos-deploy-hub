# Antigravity Install Notes

Рекомендуемая команда пользователю:

```text
Разверни COMANDOS Vector Ingestion Bundle из этой директории, установи skills, подготовь runner и проведи меня через setup.
```

После установки агент должен:

1. проверить `.env`;
2. спросить путь к документам;
3. спросить, есть ли `Supabase`;
4. если нет, попросить доступ к серверу;
5. дальше вести пользователя по `doc-splitter` и `vector-ingestion-launcher`.
