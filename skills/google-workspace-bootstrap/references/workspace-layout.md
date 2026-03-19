# Workspace Layout

## Local layout

For each messy source file, keep local generated artifacts in one sibling workspace:

```text
<source_name>__workspace/
  docs/
  tables/
  brief/
  prompts/
```

Use English names for these technical directories to keep paths stable for tools and links.

## Google Drive layout

The first Google Workspace bootstrap version creates:

```text
<case workspace folder>/
  docs/
  <case>__rag_memory
  <case>__products
```

Rules:

- keep both native Google Sheets copies in the case folder;
- keep split docs in the `docs/` subfolder;
- return links and IDs so the user can paste them into workflow settings.
