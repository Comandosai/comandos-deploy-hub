# Mature SDR Qualifier Baseline

Этот baseline нужен для regression review при обновлении `SDR_QUALIFIER_SKELETON`.

## Source baseline

Derived from latest mature qualifier prompts in `Cyber_OP/02_Prompty`, with emphasis on the latest WHIEDA qualifier generation.

## Invariants that must survive

- qualifier не должен выполнять product lookup;
- qualifier не должен использовать live catalog как консультант;
- goal — minimum useful routing payload, а не максимальный сбор полей;
- orientation-first rule обязателен;
- post-consultation handoff mode обязателен;
- после consultant result нельзя заново открывать broad discovery;
- safe DB contract должен быть явным;
- CRM sync должен быть secondary behavior, а не свободная импровизация;
- output должен быть строго JSON по фиксированному contract;
- status machine должна быть узкой и предсказуемой;
- explicit handoff wording допустим только с ясным next step.

## Project-specific patterns to keep out of universal skeleton

- конкретные DB function names, если они не universal;
- конкретные CRM tool names конкретного проекта;
- конкретная channel assumption;
- конкретные domain examples и product families.

Эти части должны идти через input profile, а не hardcode в skeleton.
