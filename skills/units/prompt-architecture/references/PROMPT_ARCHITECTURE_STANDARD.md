# Prompt Architecture Standard

## Главный принцип

Хороший системный prompt собирается из трех слоев:
1. общий коробочный каркас;
2. role-specific skeleton;
3. company-specific domain и technical layer.

Prompt нельзя писать с нуля каждый раз.

## Обязательные блоки

Каждый системный prompt должен включать:
- `role_block`
- `goal_block`
- `scope_block`
- `data_sources_block`
- `routing_block`
- `tool_usage_block`
- `live_search_block`
- `fallback_block`
- `dialog_policy_block`
- `output_format_block`
- `forbidden_actions_block`

Если блок не нужен для роли, его можно сократить, но не терять ключевые ограничения.

## Что обязательно учитывать

- реальную роль агента;
- доступные источники: knowledge, `product_memory`, live tables;
- реальные tools и workflow contracts;
- handoff boundaries;
- state machine и output contract;
- ограничения бизнеса и safety boundaries.

## Что запрещено

- генерировать prompt только по свободному описанию компании;
- выдумывать schema live-таблицы, CRM fields или DB functions;
- смешивать полноценные роли без явного требования;
- терять output/state contract ради "красивого" текста.
