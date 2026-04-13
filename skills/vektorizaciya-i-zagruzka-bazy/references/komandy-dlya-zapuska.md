# Команды для запуска

Ниже короткая схема, что пользователь должен запускать по шагам.

## 1. Установка bundle

Сначала ставится bundle `vector-ingestion-bundle`.

## 2. Разбор документов

Потом используется `doc-splitter-launcher`.

## 3. Подготовка `Supabase`

Если база не готова, агент поднимает или подключает ее.

## 4. Ingestion

Потом используется `vector-ingestion-launcher`.

## 5. Проверка

После прогона агент должен показать:
- сколько документов обработано;
- сколько чанков загружено;
- сколько строк ушло в `products_live`.

Подробные клиентские команды уже лежат в:
- [CLIENT_RUN_COMMANDS.md](/Users/artemlahtin/Documents/Cyber_OP/01_Arkhitektura_i_standarty/skill_runtime_platform/CLIENT_RUN_COMMANDS.md)
- [TELEGRAM_VECTOR_INGESTION_INSTRUCTION.md](/Users/artemlahtin/Documents/Cyber_OP/01_Arkhitektura_i_standarty/skill_runtime_platform/TELEGRAM_VECTOR_INGESTION_INSTRUCTION.md)
