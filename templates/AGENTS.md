# Wren Agent Instructions

Read `.wren/config.json` before Wren work.

## Workflow Routing

When the user invokes a Wren workflow, read and follow the matching local workflow:

- `/wren recap` -> `.wren/workflows/recap.md`
- `/wren recall` -> `.wren/workflows/recall.md`
- `/wren reflect` -> `.wren/workflows/reflect.md`

Deterministic helpers such as `wren lint`, `wren doctor`, `wren index`, `wren search`, and `wren learn list|show|drop` are not workflows. With the Pi adapter, users may invoke the same helpers as `/wren lint`, `/wren doctor`, `/wren index`, `/wren search`, and `/wren learn list|show|drop`. Run the requested helper and report its findings.

### Routing Rules

- Run Wren workflows only when the user explicitly invokes `/wren recap`, `/wren recall`, `/wren reflect`, or clearly asks to use Wren.
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

- `/wren recap`: summarize the current agent conversation into a source-level recap note; refresh BM25 when enabled.
- `/wren recall`: read the configured atlas root's `index.md`, relevant atlas pages, then source evidence as needed; append local metrics when available.
- `/wren reflect`: update cited atlas synthesis under the selected atlas section plus the configured atlas root's `index.md` and `log.md`; append local metrics and refresh BM25 when enabled.

## Learning Candidates

- Wren learning candidates are inert workflow-improvement suggestions stored only under `.wren/cache/learning/candidates/`.
- They have no authority and must not be read or applied during normal `/wren recap`, `/wren recall`, or `/wren reflect` runs.
- Never add learning-candidate content to recap notes, source notes, atlas pages, or the configured atlas root's `index.md` or `log.md`.
- Passive candidate capture may write at most one high-signal candidate after `/wren recap` or `/wren reflect`, and only to `.wren/cache/learning/candidates/<id>.md`.
- Do not promote candidates or modify `.wren/workflows/`, `.wren/templates/`, `AGENTS.md`, or `.wren/learning/` unless the user explicitly asks to review/promote learning.
- Use `wren learn list`, `wren learn show <id>`, and `wren learn drop <id>` to review or remove candidates. `wren doctor` reports pending or invalid candidates.

## Deterministic Helpers

Use the `wren ...` CLI form directly, or the equivalent `/wren ...` form when the Pi adapter is installed:

- `wren lint` / `/wren lint`: report content health issues without silent rewrites.
- `wren doctor` / `/wren doctor`: report setup, config, search-index, and learning-candidate health.
- `wren index` / `/wren index`: build the local BM25 search index.
- `wren search` / `/wren search`: search the local BM25 index.
- `wren learn list|show|drop` / `/wren learn list|show|drop`: review or remove inert learning candidates without applying them.
