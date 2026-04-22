# CyberOP Heavy Prompt Standard

## Назначение

Этот reference фиксирует production baseline для длинных sales/runtime prompts уровня `Cyber_op`.

Использовать его, когда builder собирает:
- `sdr_qualifier`;
- `consultant`;
- orchestrator-adjacent sales prompts;
- runtime prompts, где критичны state transitions, DB discipline, optional external-system gate и handoff logic.

## Default output policy

Для sales/runtime prompts default output должен быть:
- full-length;
- heavy;
- production-ready;
- с полной operational детализацией.

Не допускается default output в виде:
- short version;
- compact version;
- compressed policy prompt;
- summary-only prompt.

Compact prompt допустим только если пользователь явно просит:
- short;
- compact;
- compressed;
- reduced version.

## Heavy prompt requirements

Heavy prompt обязан содержать явно и отдельно:

1. Role layer
- кто агент;
- что он делает;
- чего он не делает;
- role isolation от соседних ролей.

2. Source-of-truth layer
- source ordering;
- источник истины для общего смысла;
- источник истины для live facts;
- что нельзя использовать как truth.

3. Tool/runtime layer
- available tools;
- allowed actions;
- forbidden actions;
- runtime gates;
- sequencing.

4. DB persistence layer
- когда write-back обязателен;
- safe function path;
- разрешённые поля;
- sequencing;
- что считается ошибкой persistence discipline.

5. Optional external CRM layer
- по умолчанию не включать в итоговый prompt;
- включать только отдельным будущим этапом, если exact actions подтверждены runtime/reference;
- если слой не включен, итоговый prompt должен быть DB-only и не должен содержать упоминаний CRM/AMO/MCP CRM даже как отключенного или пропускаемого слоя.

6. State / handoff layer
- explicit state rules;
- handoff readiness;
- terminal conditions;
- stop conditions;
- what is not completed.

7. Conversational micro-rules
- follow-up discipline;
- anti-drift rules;
- no internal jargon;
- distinction rules;
- candidate-list rules;
- no premature handoff.

8. Output contract
- exact format;
- exact state values;
- field discipline;
- no plain-text fallback when runtime expects JSON.

9. Final validation layer
- anti-hallucination checks;
- contract checks;
- state checks;
- persistence checks.

## No-compression rule

Builder не должен:
- схлопывать несколько слоёв в один абзац;
- заменять explicit contract коротким пересказом;
- убирать negative rules;
- убирать terminal conditions;
- убирать sequencing discipline;
- убирать self-check;
- считать skeleton-only short version production-ready.

## Practical target

Если проект относится к sales/runtime flows, итоговый prompt должен быть ближе по полноте:
- к `Cyber_op`-стилю;
- чем к короткой skeleton-only версии.

Skeleton использовать как structural base.
Heavy baseline использовать как completeness target.
