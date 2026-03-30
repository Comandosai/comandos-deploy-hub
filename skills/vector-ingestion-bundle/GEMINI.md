# COMANDOS Vector Ingestion Bundle | Gemini

Работай с bundle как с installable коробкой:

- агент должен задавать минимум вопросов;
- агент должен сам запускать внутренние шаги;
- если есть `prepared`-документы, ingestion flow должен идти через `runner -> commandos-api -> Supabase`;
- пользователь не должен руками думать про `runner`, `payload`, `chunks` и `embeddings`.
