# Prompt Architecture

Этот canonical bundle хранит source of truth для сборки системных промптов.

Он нужен, чтобы:
- не хранить смысл prompt-логики только внутри workflow JSON;
- не собирать новые промпты из памяти или свободной генерации;
- собирать `consultant` и `sdr_qualifier` из одного устойчивого каркаса;
- накладывать на каркас domain, tool, live-data и output contract конкретной компании.

## Источник смысла

Этот слой собран из двух источников:
- архитектурные стандарты и правила сборки prompt-ов;
- последние зрелые рабочие prompt-версии как regression baseline.

## Что входит

- `references/PROMPT_ARCHITECTURE_STANDARD.md`
- `references/PROMPT_INPUT_PROFILE_STANDARD.md`
- `references/PROMPT_OUTPUT_STANDARD.md`
- `references/ROLE_PROMPT_MODULES_STANDARD.md`
- `references/PROMPT_BUILDER_CONTRACT.md`
- `references/MATURE_CONSULTANT_BASELINE.md`
- `references/MATURE_SDR_QUALIFIER_BASELINE.md`
- `templates/CONSULTANT_SKELETON.md`
- `templates/SDR_QUALIFIER_SKELETON.md`
- `examples/consultant_input_profile.json`
- `examples/sdr_qualifier_input_profile.json`

## Главные правила

- workflow JSON не является источником истины для prompt-архитектуры;
- workflow JSON считается только runtime-носителем готового prompt;
- сначала собирается `input_profile`;
- потом выбирается role skeleton;
- потом в него добавляются domain, live-search, tool, state и output слои;
- только после этого получается итоговый `prompt_*.md`.

## Output contract для v1

На первом этапе builder должен сохранять рядом два артефакта:
- `Prompts/consultant_input_profile.json` и `Prompts/prompt_consultant.md`
- `Prompts/qualifier_input_profile.json` и `Prompts/prompt_qualifier.md`

## Что не делать

- не генерировать prompt напрямую из `brief` без skeleton-layer;
- не брать смысл prompt только из `03_WF_Qualification.json` или `04_WF_Consultation.json`;
- не выдумывать tool contract, live schema, CRM rules или output contract, если они не описаны в profile;
- не копировать зрелые prompt-версии целиком как новый universal template без role-level нормализации.
