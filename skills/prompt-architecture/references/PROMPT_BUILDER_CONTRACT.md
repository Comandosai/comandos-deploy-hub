# Prompt Builder Contract

## Назначение

Builder собирает итоговый prompt из:
- `brief`;
- `input_profile`;
- role skeleton;
- domain layer;
- tool/live/output/state layer.

## Build order

1. Прочитать `brief`.
2. Собрать или нормализовать `input_profile`.
3. Определить роль: `consultant` или `sdr_qualifier`.
4. Взять соответствующий skeleton.
5. Добавить company/domain layer:
   - терминология;
   - категории;
   - ограничения бизнеса;
   - типовые user intents.
6. Добавить data-source layer:
   - RAG;
   - `product_memory`, если он есть;
   - live table contracts;
   - source priority.
7. Добавить technical layer:
   - tools;
   - CRM rules;
   - DB write rules;
   - allowed/forbidden actions.
8. Добавить handoff/state/output layer.
9. Сверить результат с mature baseline для той же роли.
10. Сохранить `input_profile` и итоговый `prompt_*.md`.

## Validation gates

Перед тем как считать prompt готовым, builder обязан проверить:
- роль не смешана с другой полноценной ролью;
- все critical tool contracts описаны явно;
- live schema не выдумана;
- output contract определен;
- state/handoff rules определены;
- anti-hallucination rules присутствуют;
- mature baseline invariants не потеряны.

## Hard prohibitions

- не использовать workflow JSON как основной источник prompt-смысла;
- не собирать prompt напрямую из `brief` без skeleton;
- не выдумывать отсутствующие technical contracts;
- не сохранять только итоговый prompt без рядом лежащего input profile.
