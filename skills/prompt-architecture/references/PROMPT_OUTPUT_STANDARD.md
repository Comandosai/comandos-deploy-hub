# Prompt Output Standard

Для v1 builder должен выдавать два типа артефактов:

1. input profile
2. итоговый системный prompt

## Canonical output files

Для `consultant`:
- `Prompts/consultant_input_profile.json`
- `Prompts/prompt_consultant.md`

Для `sdr_qualifier`:
- `Prompts/qualifier_input_profile.json`
- `Prompts/prompt_qualifier.md`

## Quality bar

Итоговый prompt должен:
- быть role-specific;
- учитывать реальные tools;
- учитывать RAG/live routing;
- учитывать output contract;
- учитывать state/handoff rules;
- не содержать фантазий о недоступных действиях.

## Что не включать

- chain-of-thought;
- свободные объяснения "почему так";
- сырой profile dump без переработки;
- module-by-module dump как обязательную часть v1.
