---
name: google-workspace-bootstrap
description: Create a Google Workspace case workspace for document-ingestion projects by making a Drive folder, a `docs` subfolder, and native copies of two Google Sheets templates, then returning the folder links and table IDs needed for workflow setup. Use when a user wants one-command Google Drive bootstrap around a messy source file, needs native Google Sheets copies instead of `.xlsx` uploads, or needs ready-to-paste table IDs for downstream workflows.
---

# Google Workspace Bootstrap

Create a Google Drive workspace for one case, keep the Google artifacts together, and return a setup-ready result.

Use the bundled script for deterministic work. Do not rebuild the Drive-copy logic ad hoc in each task.

## Workflow

1. Confirm the required inputs:
- Google account email
- workspace folder name
- RAG template sheet ID
- products template sheet ID
- optional parent Drive folder ID
- optional local docs directory for later upload steps

2. Create the Drive workspace:
- top-level case folder
- `docs` subfolder inside the case folder

3. Make native copies of both template Sheets into the case folder:
- one RAG / memory sheet
- one products sheet

4. Return setup-ready output:
- `workspace_folder_url`
- `workspace_folder_id`
- `docs_folder_url`
- `docs_folder_id`
- `rag_table_url`
- `rag_table_id`
- `products_table_url`
- `products_table_id`

## Rules

- Always use native Google Drive copy for template Sheets.
- Never use download/upload via `.xlsx` for production bootstrap.
- Keep Google Workspace outputs inside one case folder.
- Use the script in `scripts/google_workspace_bootstrap.py` unless there is a strong reason not to.
- If the user wants local artifacts too, keep local outputs in a sibling workspace layout described in [references/workspace-layout.md](references/workspace-layout.md).

## Script

Run:

```bash
python scripts/google_workspace_bootstrap.py \
  --user-email user@example.com \
  --workspace-name case_workspace_name \
  --rag-template-id <RAG_TEMPLATE_ID> \
  --products-template-id <PRODUCTS_TEMPLATE_ID>
```

The script prints JSON that can be pasted into workflow settings.

## Output Contract

The bootstrap result must include:

- `workspace_folder_url`
- `workspace_folder_id`
- `docs_folder_url`
- `docs_folder_id`
- `rag_table_url`
- `rag_table_id`
- `products_table_url`
- `products_table_id`

## References

- Local and Google workspace layout: [references/workspace-layout.md](references/workspace-layout.md)

## Limits

- This first version focuses on folder bootstrap and native Sheets copies.
- Uploading split docs into Google Docs is a later step and should be added on top of this foundation, not mixed into ad hoc copy logic.
