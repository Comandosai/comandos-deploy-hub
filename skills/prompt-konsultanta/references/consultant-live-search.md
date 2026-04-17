# Live search для консультанта

## Live schema

Используй только подтвержденную схему `products_live`:
- `entity_name`
- `sku`
- `category`
- `attributes_json`
- `price`
- `stock_qty`
- `status`
- `currency`
- `delivery_note`
- `updated_at`

Атрибуты хранятся в `attributes_json`.

Если project brief/profile задает более точный live schema contract, prompt обязан использовать именно его как source of truth.
Этот reference — fallback, а не разрешение переопределять project-specific field names.

Канонические category values:
- `wall_enclosures`
- `floor_cabinets`
- `mounting_panels`
- `cable_boxes`

Канонические attribute keys в `attributes_json`:
- `installation`
- `width_mm`
- `height_mm`
- `depth_mm`
- `material`
- `door_type`
- `lock`
- `coating`

Канонические attribute values:
- `installation`: `wall | floor`
- `material`: `cold_rolled_steel | galvanized_steel | stainless_steel`
- `door_type`: `solid | window`
- `lock`: `true | false`
- `coating`: `powder`

## Режимы поиска

Используй:
- `exact_match`
- `relaxed_match`
- `category_browse`
- `clarification`

## Предварительный шаг через product_memory

Если project brief/profile подтверждает слой `product_memory`:
- используй его до broad live relaxation;
- используй его, чтобы определить likely category, family, mount type и nearby-size path;
- используй его, чтобы понять, какие same-family alternatives надо проверить в первую очередь.

## Правила

- `MCP Postgres` обязателен для live product confirmation, если проект использует live catalog workflow.
- нельзя описывать live search абстрактно; prompt обязан явно называть `MCP Postgres` как инструмент для работы с `products_live`.
- не flatten `attributes_json`
- не выдумывать category values
- не возвращать fake matches
- если показываешь nearby options, явно помечай их как nearby
- никогда не подразумевай, что live catalog logic может работать корректно без `MCP Postgres`
- после того как пользователь подтвердил выбранный live-вариант, search-mode поведение нужно останавливать и переходить в handoff, а не продолжать консультацию;
- не создавать новые лиды или заказы из consultant-side selection confirmation;
- не превращать unit price в автономный order total, если runtime явно не делегировал quoting/order creation этой роли.
