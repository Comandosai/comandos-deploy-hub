# DB для квалификатора

## Safe DB contract

`MCP Postgres` обязателен, когда проект хранит lead memory в Postgres.
Если проект использует factual live layer или persisted lead memory через Postgres, prompt обязан относиться к `MCP Postgres` как к железобетонному обязательному инструменту.

Если `lead_id` доступен и в текущем ходе подтвержден хотя бы один meaningful new fact, используй только:

`SELECT * FROM public.update_lead_profile_safe(...)`

Подтвержденные параметры:
- `p_lead_id`
- `p_name`
- `p_phone`
- `p_email`
- `p_qualification_summary`
- `p_qualification_score`
- `p_purchase_purpose`
- `p_budget_min`
- `p_budget_max`
- `p_purchase_timeline`
- `p_product_interest`

Обязательные правила SQL-вызова:
- использовать named-argument форму с `=>`
- всегда включать `p_lead_id => <lead_id>::integer`
- использовать явные касты для всех значений
- использовать typed null для неизвестных значений
- `p_qualification_score` по умолчанию всегда `NULL::integer`
- не выдумывать дополнительные safe params
- не использовать сокращенные или свободные SQL-варианты

Канонический safe call pattern:

```sql
SELECT *
FROM public.update_lead_profile_safe(
  p_lead_id => <lead_id>::integer,
  p_name => <value_or_null>::text,
  p_phone => <value_or_null>::text,
  p_email => <value_or_null>::text,
  p_qualification_summary => <value_or_null>::text,
  p_qualification_score => NULL::integer,
  p_purchase_purpose => <value_or_null>::text,
  p_budget_min => <value_or_null>::numeric,
  p_budget_max => <value_or_null>::numeric,
  p_purchase_timeline => <value_or_null>::text,
  p_product_interest => <value_or_null>::text
);
```

Никогда не выдумывай:
- не опускай `p_lead_id`
- не используй `=` вместо `=>`
- не полагайся на implicit type resolution
- не передавай untyped `NULL`
- не переходи к ad-hoc укороченному вызову
- `p_company`
- `p_position`
- `p_industry`
- `p_result_summary`
- любые product-attribute safe params

## No external CRM layer by default

На текущем этапе итоговый prompt квалификатора должен быть DB-only.

Если CRM не включена отдельным будущим этапом и в profile нет явно подтвержденных exact actions, итоговый prompt не должен содержать слова или tool names:
- `CRM`
- `AMO`
- `AmoCRM`
- `amoCRM`
- `MCP CRM`
- `MCP AmoCRM`
- `skip CRM`

Не описывай CRM даже как неактивную, отключенную или пропускаемую возможность.
Не добавляй CRM-step в normal path.
Не добавляй generic external sync.

Если `MCP Postgres` есть в project contract, но итоговый qualifier prompt не требует его явно для обновления lead-profile, такой prompt невалиден.

## Поведение полей

- `p_qualification_summary`:
  - обновлять каждый раз, когда подтвержден meaningful new qualification fact;
  - держать коротким, фактическим и handoff-ready;
  - включать туда факты без отдельных safe params, например размеры, количество, материал, тип установки, среду эксплуатации, наличие чертежа и кастомные требования;
  - не оставлять пустым, если meaningful qualification facts уже известны.

## Дисциплина DB write

- после каждого meaningful new confirmed fact prompt должен предпочитать safe DB update до следующего вопроса;
- нельзя собирать несколько ходов новых фактов, оставляя lead DB пустой;
- нельзя переписывать один и тот же summary, если новых фактов не появилось;
- если `lead_id` или runtime DB access отсутствуют, prompt может пропустить запись, но обязан сохранить summary logic в своих инструкциях.

## Обязательная последовательность

Если подтвержден meaningful new fact, prompt обязан соблюдать только такую последовательность:
1. обновить `p_qualification_summary`;
2. выполнить lead DB write-back через `public.update_lead_profile_safe(...)`, если доступен `lead_id`;
3. только после persistence steps формировать user-facing reply.

Нельзя:
- сначала отвечать пользователю, а запись откладывать;
- добавлять внешний sync-step, если он не включен отдельным будущим этапом.
