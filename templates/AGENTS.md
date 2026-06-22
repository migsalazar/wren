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
- Write only configured Wren areas and derived `.wren/cache/` files during normal workflows.
- Edit `.wren/config.json`, workflows, or templates only when explicitly asked.
- Do not rewrite existing notes unless explicitly asked.
- Do not create or switch git branches as part of Wren.
- For agent workflow writes: write directly in git-backed vaults; ask approval first in non-git vaults. Direct CLI commands execute as requested.
- Search before reading broadly; prefer narrow, relevant files.
- If `useBm25` is true, `/wren recall` may use `wren search`; if false, do not use it.

## Workflow Summary

- `/wren capture`: create a source-level conversation note; refresh BM25 when enabled.
- `/wren recall`: read `wiki/index.md`, relevant wiki pages, then source evidence as needed; append local metrics when available.
- `/wren reflect`: update cited wiki synthesis plus `wiki/index.md` and `wiki/log.md`; append local metrics and refresh BM25 when enabled.
- `/wren lint`: report health issues without silent rewrites.

