# Wren Agent Instructions

Read `.wren/config.json` before Wren work.

## Workflow Routing

When the user invokes Wren, read and follow the matching local workflow:

- `/wren recap` -> `.wren/workflows/recap.md`
- `/wren recall` -> `.wren/workflows/recall.md`
- `/wren reflect` -> `.wren/workflows/reflect.md`
- `/wren lint` -> `.wren/workflows/lint.md`

### Routing Rules

- Run Wren workflows only when the user explicitly invokes `/wren <command>`, `wren <command>`, or clearly asks to use Wren.
- Treat ordinary conversational uses of “recap”, “recall”, “reflect”, or “lint” as normal requests, not Wren workflow requests.
- If a workflow file is missing, say the scaffold is incomplete and suggest `wren init`.

## Boundaries

- Configured Wren areas and source folders live in `.wren/config.json`.
- Read the configured atlas root and `sources` as needed; read outside them only when the user explicitly provides files or paths.
- Write only configured Wren areas and derived `.wren/cache/` files during normal workflows.
- Create or save recap notes, update atlas synthesis, or perform other Wren workflow writes only when the user explicitly invokes the relevant Wren command or clearly asks to use Wren.
- Edit `.wren/config.json`, workflows, or templates only when explicitly asked.
- Do not rewrite existing notes unless explicitly asked.
- Do not create or switch git branches as part of Wren.
- For agent workflow writes: write directly in git-backed vaults; ask approval first in non-git vaults. Direct CLI commands execute as requested.
- Search before reading broadly; prefer narrow, relevant files.
- If `useBm25` is true, `/wren recall` may use `wren search`; if false, do not use it.

## Workflow Summary

- `/wren recap`: create a source-level conversation note; refresh BM25 when enabled.
- `/wren recall`: read the configured atlas root's `index.md`, relevant atlas pages, then source evidence as needed; append local metrics when available.
- `/wren reflect`: update cited atlas synthesis under the selected atlas section plus the configured atlas root's `index.md` and `log.md`; append local metrics and refresh BM25 when enabled.
- `/wren lint`: report health issues without silent rewrites.
