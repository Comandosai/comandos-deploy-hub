---
name: vector-ingestion-bundle
description: Install and launch the COMANDOS vector ingestion bundle for document split, ingestion, and Supabase bootstrap across Antigravity, Claude, Codex, or terminal-based workflows.
---

# COMANDOS Vector Ingestion Bundle

Use this directory as the public GitHub entrypoint for the new COMANDOS flow.

This is the bundle entrypoint for:

- document split
- vector ingestion
- Supabase bootstrap / connection
- later prompt generation and testing

## What to do

1. Read [README.md](README.md) first.
2. Use the client-specific notes when needed:
- [installers/antigravity.md](installers/antigravity.md)
- [installers/claude.md](installers/claude.md)
- [installers/codex.md](installers/codex.md)
3. For document preparation, use:
- [skills/doc-splitter-launcher/SKILL.md](skills/doc-splitter-launcher/SKILL.md)
4. For ingestion into `Supabase`, use:
- [skills/vector-ingestion-launcher/SKILL.md](skills/vector-ingestion-launcher/SKILL.md)

## Rules

- Keep the user inside the current bundle runtime path.
- If the project involves personal data, require a Russian server for production `Supabase`.
- Do not make the user manually run `node` in the normal flow; treat the runner as an internal implementation detail.
