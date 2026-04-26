# Рабочие схемы MCP AmoCRM

Этот файл хранит только переносимые шаблоны. Реальные `field_id`, `crm_contact_id`, `crm_deal_id`, статусы и названия стадий брать из CRM-карты проекта.

## Главное правило

Не угадывать формат вызова `MCP AmoCRM`.

Перед сборкой CRM prompt нужно снять или проверить список доступных tools и их input schema через текущий клиентский `n8n` и credential `MCP AmoCRM`.

Если схема инструмента отличается от примеров ниже, использовать фактическую схему текущего инструмента.

## `update_contact`

Обычные поля контакта можно передавать плоско, если это есть в схеме инструмента:

```json
{
  "id": "<crm_contact_id>",
  "name": "<client_name>",
  "phone": "<client_phone>",
  "email": "<client_email>"
}
```

Кастомные поля контакта передавать через `custom_fields_values`, если текущая схема `update_contact` это поддерживает:

```json
{
  "id": "<crm_contact_id>",
  "name": "<client_name>",
  "phone": "<client_phone>",
  "custom_fields_values": [
    {
      "field_id": "<field_id_purchase_purpose>",
      "values": [
        { "value": "<purchase_purpose>" }
      ]
    },
    {
      "field_id": "<field_id_purchase_timeline>",
      "values": [
        { "value": "<purchase_timeline>" }
      ]
    },
    {
      "field_id": "<field_id_product_interest>",
      "values": [
        { "value": "<product_interest>" }
      ]
    },
    {
      "field_id": "<field_id_lead_temperature>",
      "values": [
        { "value": "<lead_temperature>" }
      ]
    },
    {
      "field_id": "<field_id_handoff_reason>",
      "values": [
        { "value": "<handoff_reason>" }
      ]
    },
    {
      "field_id": "<field_id_budget>",
      "values": [
        { "value": "<budget_number>" }
      ]
    }
  ]
}
```

Правила:

- не отправлять пустой `email`, если клиент его не дал;
- не отправлять пустой `phone`, если телефона нет;
- не писать строку `"null"` в поля CRM;
- если в CRM-карте есть кастомные поля контакта, но `custom_fields_values` не ушел в фактический вызов, считать тест неуспешным;
- `field_id` брать только из снятой структуры AmoCRM.

## `update_lead`

Для сделки передавать только подтвержденные поля из схемы инструмента:

```json
{
  "id": "<crm_deal_id>",
  "status_id": "<selected_stage_id>"
}
```

Если в схеме инструмента поддерживаются `name` или `price`, использовать их только при подтвержденном факте:

```json
{
  "id": "<crm_deal_id>",
  "status_id": "<selected_stage_id>",
  "name": "<confirmed_deal_name>",
  "price": "<confirmed_price_number>"
}
```

Правила:

- никогда не отправлять `id = 0`;
- не создавать новую сделку из CRM Operator, если CRM-карта проекта это не разрешает;
- не придумывать поля сделки, если MCP не вернул их список;
- финальные статусы успеха и отказа ставить только если CRM-карта явно разрешает автоматическое закрытие.

## Проверка после теста

Успешный CRM-тест считается подтвержденным только если:

- в `public.lead_events` есть `crm_sync` со статусом `completed`;
- фактический вызов `update_contact` содержит нужные CRM-поля;
- контакт в AmoCRM показывает заполненные поля;
- сделка перешла на правильный этап;
- при handoff отдельно созданы заметка и задача через handoff workflow.
