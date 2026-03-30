# COMANDOS Vector Ingestion Bundle | Claude

При работе с этим bundle:

- сначала ставь локальные skills;
- потом веди пользователя через `doc-splitter`;
- затем через `vector-ingestion-launcher`;
- не заставляй пользователя вручную запускать `node` или руками собирать таблицы;
- если `products_live` есть в source, он должен формироваться в основном прогоне, а не отдельным вопросом после.
