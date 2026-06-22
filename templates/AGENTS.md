# Wren Agent Instructions

Read `.wren/config.json` before Wren work.

## Workflow Routing

When the user invokes Wren, read and follow the matching local workflow:

- `/wren capture` -> `.wren/workflows/capture.md`
- `/wren recall` -> `.wren/workflows/recall.md`
- `/wren reflect` -> `.wren/workflows/reflect.md`
- `/wren lint` -> `.wren/workflows/lint.md`

If the host does not expose `/wren`, treat those strings or named Wren requests as workflow requests. If a workflow file is missing, say the scaffold is incomplete and suggest `wren init`.

## Boundaries

- Configured Wren areas and source folders live in `.wren/config.json`.
- Read configured wiki areas and `sources` as needed; read outside them only when the user explicitly provides files or paths.
- Write only configured Wren areas and `.wren/` protocol/cache files.
- Do not rewrite existing notes unless explicitly asked.
- Do not create or switch git branches as part of Wren.
- For configured-area writes: write directly in git-backed vaults; ask approval first in non-git vaults.
- Search before reading broadly; prefer narrow, relevant files.
- If `useBm25` is true, `/wren recall` may use `wren search`; if false, do not use it.

## Workflow Summary

- `/wren capture`: create a source-level conversation note; refresh BM25 when enabled.
- `/wren recall`: read `wiki/index.md`, relevant wiki pages, then source evidence as needed.
- `/wren reflect`: update cited wiki synthesis plus `wiki/index.md` and `wiki/log.md`; refresh BM25 when enabled.
- `/wren lint`: report health issues without silent rewrites.

## Wiki Rules

`wiki/index.md` is the content catalog. Use this structure unless category sections are more useful:

```md
# Wren Index

## Wiki Pages

- [[page-name]] — one-line summary.
```

- Read `wiki/index.md` first during recall.
- Update `wiki/index.md` whenever wiki pages are created or meaningfully changed.
- Keep `wiki/index.md` and `wiki/log.md` concise; they are productive files, not instruction templates.
- `wiki/log.md` is append-only; headings should use `## [YYYY-MM-DD] type | Title`.
- Generated wiki synthesis pages require `## Sources`.
