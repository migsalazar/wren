# Wren Agent Instructions

Read `.wren/config.json` before doing Wren work.

## Local Wren Workflows

Wren workflows are vault-local protocol files, not global agent skills.

When the user invokes a Wren workflow, read the corresponding local workflow file and follow it:

- `/wren capture` -> `.wren/workflows/capture.md`
- `/wren recall` -> `.wren/workflows/recall.md`
- `/wren reflect` -> `.wren/workflows/reflect.md`
- `/wren lint` -> `.wren/workflows/lint.md`

If a workflow file is missing, explain that the Wren workflow scaffold is incomplete and suggest running `wren init`.

## Boundaries

- Wren areas and source folders are configured in `.wren/config.json`.
- Wren only has write permission in folders it knows through configuration.
- Configured `sources` are readable source evidence.
- The capture area is ordinary source evidence when it is listed in `sources`, and Wren can write captures there with user approval.
- Wiki workspaces are generated synthesis.
- Search before reading broadly; prefer a narrow set of relevant source files.
- Do not read outside configured `sources` unless the user explicitly provides additional files or paths for the current task.
- Do not rewrite notes unless explicitly asked.
- Do not write outside configured Wren areas.

## Workflow Summary

- `/wren capture`: summarize the current agent discussion into the configured capture area as source-level memory.
- `/wren recall`: read the wiki index first, then relevant wiki pages, then configured source evidence only as needed.
- `/wren reflect`: update wiki synthesis from cited configured source evidence, including index and log updates.
- `/wren lint`: report structure/link/source issues without silently rewriting notes.

## Wiki Rules

- `wiki/index.md` is the content-oriented catalog of wiki pages: link, one-line summary, and useful category/metadata.
- Read `wiki/index.md` first during recall.
- Update `wiki/index.md` whenever wiki pages are created or meaningfully changed.
- `wiki/log.md` is append-only and chronological.
- Log headings should use `## [YYYY-MM-DD] type | Title`.
- Generated wiki synthesis pages require `## Sources`.
