# Wren Agent Instructions

Read `.wren/config.json` before doing Wren work.

## Local Wren Workflows

Wren workflows are vault-local protocol files, not global agent skills.

When the user invokes a Wren workflow, including through a host adapter command such as `/wren`, read the corresponding local workflow file and follow it:

- `/wren capture` -> `.wren/workflows/capture.md`
- `/wren recall` -> `.wren/workflows/recall.md`
- `/wren reflect` -> `.wren/workflows/reflect.md`
- `/wren lint` -> `.wren/workflows/lint.md`

If the host does not expose `/wren` as an installed slash command, treat these forms as workflow requests when the user types them or asks to use Wren by name.

If a workflow file is missing, explain that the Wren workflow scaffold is incomplete and suggest running `wren init`.

## Boundaries

- Wren areas and source folders are configured in `.wren/config.json`.
- Wren only has write permission in configured Wren areas and `.wren/` protocol/cache files.
- Configured `sources` are readable source evidence.
- The capture area is ordinary source evidence when it is listed in `sources`, and Wren can write captures there.
- Wiki workspaces are generated synthesis.
- Search before reading broadly; prefer a narrow set of relevant source files.
- If `useBm25` is true, `/wren recall` may use `wren search` as a deterministic retrieval helper.
- If `useBm25` is false, do not use `wren search` during `/wren recall`.
- Do not read outside configured `sources` unless the user explicitly provides additional files or paths for the current task.
- Do not rewrite existing notes unless explicitly asked.
- Do not write outside configured Wren areas or `.wren/` protocol/cache files.
- Do not create or switch git branches as part of Wren.
- For configured-area writes, follow the workflow approval policy: write directly in git-backed vaults; ask approval first in non-git vaults.

## Workflow Summary

- `/wren capture`: summarize the current agent discussion into the configured capture area as source-level memory, then refresh BM25 when enabled.
- `/wren recall`: read the wiki index first, then relevant wiki pages, then use BM25/configured source evidence only as needed.
- `/wren reflect`: update wiki synthesis from cited configured source evidence, including wiki index and log updates, then refresh BM25 when enabled.
- `/wren lint`: report structure/link/source issues without silently rewriting notes.

## Wiki Rules

- `wiki/index.md` is the content-oriented catalog of wiki pages.
- Use this index structure unless a more specific grouping is useful:

  ```md
  # Wren Index

  ## Wiki Pages

  - [[page-name]] — one-line summary.
  ```

- Read `wiki/index.md` first during recall.
- Update `wiki/index.md` whenever wiki pages are created or meaningfully changed.
- `wiki/log.md` is append-only and chronological.
- Keep `wiki/index.md` and `wiki/log.md` concise; they are productive files, not instruction templates.
- Log headings should use `## [YYYY-MM-DD] type | Title`.
- Generated wiki synthesis pages require `## Sources`.
