# Wren Workflow: /wren capture

Use this workflow when the user invokes `/wren capture` inside a Wren vault.

## Purpose

Summarize the current agent discussion into a source-level capture note for later recall, review, or reflection.

Capture is not wiki synthesis. Do not update wiki pages, `wiki/index.md`, or `wiki/log.md` during this workflow.

## Inputs

The user may optionally provide:

- a title
- one or more tags
- emphasis about what should be preserved

If the title is missing, choose a concise descriptive title from the discussion.
If tags are missing, choose a small set of relevant tags.

## Rules

- Read `.wren/config.json` before writing.
- Write the capture note only to the configured capture area.
- Do not write outside the configured capture area except for derived `.wren/cache/` search-index updates when BM25 is enabled.
- Do not write to wiki workspaces.
- Preserve the discussion as source-level memory, not polished worldview synthesis.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- If the vault is inside a git repository, write the capture directly without asking for approval.
- If the vault is not inside a git repository, show the target path and proposed capture content, then wait for explicit user approval before writing.
- If the configured capture area does not exist yet, include this in the non-git approval prompt or the git-backed completion report: `The folder <capture path>/ did not exist, so Wren created that configured capture area directory.`
- If `useBm25` is true, refresh the search index after a successful write by running `wren index` from the vault root. If the command cannot run, report that the search index may be stale.

## Capture Content

Preserve:

- summary of the discussion
- important assumptions
- disagreements or tensions
- tags as Markdown tags

Use a simple date metadata block with only `date` until the lint/schema rules are defined. The default capture template keeps the title as the first line for Obsidian compatibility. Render tags through the template `{{tags}}` placeholder as Markdown tags, not metadata.

## Suggested Procedure

1. Identify the configured capture path from `.wren/config.json`.
2. Determine whether the vault is git-backed.
3. Draft a capture note using `.wren/templates/capture.md` as the editable structure.
4. Include only contextual details that materially help interpret the capture.
5. If the vault is not git-backed, ask the user to approve the content and path.
6. Write the note to the capture area.
7. Refresh the BM25 search index when enabled.
8. Report the created path and any index refresh warning.
