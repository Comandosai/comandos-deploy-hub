# Antigravity Install Notes

Рекомендуемая команда пользователю:

```text
Разверни COMANDOS Vector Ingestion Bundle из этой директории, установи skills, подготовь runner и проведи меня через setup.
```

После установки агент должен:

1. проверить `.env`;
2. спросить путь к документам;
3. спросить, есть ли `Supabase`;
4. если нет, попросить доступ к серверу и развернуть `Supabase` через `https://github.com/Comandosai/comandos-deploy-hub/tree/main/supabase-stack`;
5. дальше вести пользователя по `doc-splitter` и `vector-ingestion-launcher`.

Важно:

- стандартный путь развертывания БД для этого bundle — именно `supabase-stack`;
- не заменять его на обычный `Postgres` или `pgvector`, если пользователь явно не попросил временный нестандартный тестовый сценарий.
