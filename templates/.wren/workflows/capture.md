# Wren Workflow: /wren capture

Create a source-level capture note from the current agent discussion.

## Inputs

The user may provide a title, tags, or preservation instructions. If missing, choose a concise title and a small set of relevant tags.

## Rules

- Read `.wren/config.json` first.
- Write the capture note only to the configured capture area.
- Do not update wiki pages, `wiki/index.md`, or `wiki/log.md`.
- Do not write outside the capture area except derived `.wren/cache/` search-index updates when BM25 is enabled.
- Preserve source-level memory: summary, assumptions, disagreements/tensions, and Markdown tags.
- Use `.wren/templates/capture.md`; keep only `date` metadata until lint/schema rules exist.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- Git-backed vault: write directly.
- Non-git vault: show target path and proposed content, then wait for explicit approval.
- If the capture area does not exist, report that Wren created it or include that fact in the non-git approval prompt.
- If `useBm25` is true, ensure the search index is refreshed after writing; report if it may be stale.

## Steps

1. Read config and identify the capture path.
2. Determine git-backed vs non-git write policy.
3. Draft the note from `.wren/templates/capture.md`.
4. Ask approval only when required by the rules.
5. Write the capture note.
6. Ensure BM25 is refreshed when enabled.
7. Report the created path and any index warning.
