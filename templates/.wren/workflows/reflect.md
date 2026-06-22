# Wren Workflow: /wren reflect

Use this workflow when the user invokes `/wren reflect` inside a Wren vault.

## Purpose

Turn configured source notes into source-linked wiki synthesis.

Reflection maintains what Wren understands. It is deeper than capture and should remain traceable to evidence. Capture notes are ordinary source notes when they are listed in `sources`, not the privileged source of truth.

## Rules

- Read `.wren/config.json` before reflecting.
- Use configured `sources` as the default evidence scope.
- Treat capture notes as ordinary source evidence when the capture path is listed in `sources`.
- If the user provides note files or folders outside configured `sources`, treat them as explicitly provided evidence for the current task.
- Do not read outside configured `sources` unless the user explicitly provides additional files or paths for the current task.
- Search before reading broadly; prefer a narrow set of relevant source files.
- Write synthesis only to configured wiki workspaces.
- Do not rewrite source notes or capture notes unless the user explicitly asks.
- Generated wiki synthesis pages require a `## Sources` section that cites source notes.
- Keep `wiki/index.md` as a concise content catalog of wiki pages.
- Use this `wiki/index.md` structure unless a more specific grouping is useful:

  ```md
  # Wren Index

  ## Wiki Pages

  - [[page-name]] — one-line summary.
  ```

- When categories are useful, replace or extend `## Wiki Pages` with category sections such as `## Projects` or `## Concepts`.
- Keep `wiki/log.md` as a concise append-only activity log.
- Treat `wiki/index.md` and `wiki/log.md` as productive files, not instruction templates. If old default scaffold prose or empty-state placeholders remain, remove them during the next meaningful update while preserving real catalog entries and log entries.
- Update `wiki/index.md` on every wiki page creation or meaningful wiki page change.
- Append meaningful activity to `wiki/log.md`; do not rewrite prior log entries.
- Use parseable log headings: `## [YYYY-MM-DD] reflect | Title`.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- If the vault is inside a git repository, apply clear, minimal wiki/index/log changes directly without asking for approval.
- If the vault is not inside a git repository, show the proposed wiki changes, index changes, and log entry, then wait for explicit user approval before writing.
- Ask before destructive or unusual changes, including deleting pages, renaming pages, rewriting large unrelated sections, or writing outside configured wiki workspaces.
- Do not report "no changes" without listing what evidence was searched or read and why no wiki update is warranted.
- If `useBm25` is true and reflection changes wiki files, refresh the search index after writing by running `wren index` from the vault root. If the command cannot run, report that the search index may be stale.

## Suggested Procedure

1. Identify the relevant wiki workspace and configured source folders.
2. Determine whether the vault is git-backed.
3. Search or read relevant notes from configured `sources`, or from explicitly provided evidence paths.
4. Extract claims, questions, patterns, decisions, and tensions.
5. Draft wiki updates with source links. For new wiki pages, use `.wren/templates/wiki.md` as the editable structure and render useful tags through the `{{tags}}` placeholder as Markdown tags.
6. Draft corresponding `wiki/index.md` updates for every created or meaningfully changed wiki page, keeping the index concise.
7. Draft a concise `wiki/log.md` entry using `## [YYYY-MM-DD] reflect | Title`.
8. If the vault is not git-backed, ask the user to approve the changes.
9. Update or create synthesis pages, the index, and the log.
10. Refresh the BM25 search index when enabled and wiki files changed.

## Output

Report concisely:

- source files read
- wiki files changed
- key synthesis added
- unresolved questions or risks
- index refresh status, when relevant
