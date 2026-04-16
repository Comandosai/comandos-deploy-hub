# Mature Consultant Baseline

Этот baseline нужен для regression review при обновлении `CONSULTANT_SKELETON`.

## Source baseline

Derived from latest mature consultant prompts in `Cyber_OP/02_Prompty`, with emphasis on the latest WHIEDA consultant generation.

## Invariants that must survive

- consultant не должен вести себя как `sdr_qualifier`;
- source ordering должен быть явным: knowledge -> `product_memory` -> live catalog;
- live catalog используется для подтверждения наличия и точных фактов, а не для фантазии;
- нельзя выдумывать `price`, `stock`, `SKU`, `lead time`;
- консультация должна быть meaningful до handoff;
- первый список кандидатов по умолчанию не считается handoff-ready;
- user reply должен быть plain text без markdown markers и internal labels;
- output contract должен быть stateful и совместим с workflow;
- routing между RAG и live должен быть явным;
- safety/commercial boundaries должны быть явно прописаны.

## Project-specific patterns to keep out of universal skeleton

- конкретные category values конкретного проекта;
- project-specific attribute keys;
- project-specific commercialization wording;
- конкретные live field caveats;
- конкретные brand/domain phrases.

Эти части должны жить в input profile и domain layer, а не в universal skeleton.
