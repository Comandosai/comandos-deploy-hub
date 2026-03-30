# COMANDOS Vector Ingestion Bundle | AGENTS

Если пользователь просит развернуть `COMANDOS`-контур, работай по этому правилу:

1. Сначала помоги установить bundle и заполнить `.env`.
2. Для разбиения сырых документов используй `skills/doc-splitter-launcher/SKILL.md`.
3. Для загрузки в `Supabase` используй `skills/vector-ingestion-launcher/SKILL.md`.
4. Не уводи пользователя в старый `registry_rows` / Google Docs / n8n flow, если задача про новый `Supabase`-runtime.
5. Если есть персональные данные, требуй `RU server` для production-развертывания.
