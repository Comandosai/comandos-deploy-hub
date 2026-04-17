---
name: Сборка брифа
description: Собирает технический бриф компании и Prompt Input Profile из нормализованных документов, registry rows и live product rows. Использовать после подготовки документов, когда нужен единый source of truth для следующих навыков генерации промптов.
---

# Сборка брифа

## Обзор

Используй этот навык после `Векторизация и загрузка базы` и после подготовки документов.

Этот навык:
- не разбирает сырые файлы;
- не строит системные промпты;
- собирает один технический `brief`;
- собирает один структурированный `Prompt Input Profile`.

## Workflow

1. Прочитай нормализованные документы, registry rows и live product rows.
2. Вытащи только факты, которые реально влияют на prompt behavior, routing и live search.
3. Собери компактный технический `brief`.
4. Собери структурированный `Prompt Input Profile`.
5. Явно зафиксируй:
- live schema contract;
- live value contract;
- catalog browse contract;
- tool / workflow assumptions.
- CRM gate:
  - `crm_enabled`
  - `crm_type`
  - `crm_write_enabled`
  - `crm_exact_actions`
- DB gate:
  - подтверждена ли lead memory в Postgres;
  - обязателен ли `MCP Postgres` только для live facts или и для persisted memory тоже.

## Главные правила

- `brief` — это технический handoff-артефакт, а не продающий текст.
- Не дублируй один и тот же факт в нескольких разделах.
- Если live schema известна, зафиксируй её явно.
- Если canonical values известны, зафиксируй их явно.
- Если browse behavior виден из материалов, добавь `Catalog Browse Contract`.
- Не выдумывай CRM, DB, schema или output contracts.
- Если из материалов нельзя доказать наличие рабочего CRM write-path, зафиксируй `skip CRM`, а не `unknown active CRM`.
- Если в проекте подтверждены live facts или lead memory в Postgres, зафиксируй `MCP Postgres` как обязательный инструмент явно.

## Обязательные references

Сначала прочитай:
- `references/brief-structure.md`
- `references/profile-structure.md`
- `../prompt-architecture/references/PROMPT_INPUT_PROFILE_STANDARD.md`

## Выход

По умолчанию навык должен сохранить:
- один компактный `brief`;
- один `Prompt Input Profile`.

Этот навык не должен строить:
- `sdr_qualifier`;
- `consultant`.
