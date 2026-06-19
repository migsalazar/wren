# Wren Workflow: /wren reflect

Use this workflow when the user invokes `/wren reflect` inside a Wren vault.

## Purpose

Turn configured source notes into wiki synthesis.

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
- Generated wiki synthesis pages require a `## Sources` section.
- Keep `wiki/index.md` concise and useful.
- Append meaningful activity to `wiki/log.md`; do not rewrite prior log entries.
- Show proposed wiki changes before writing and wait for approval.
- Do not report "no changes" without listing what evidence was searched or read and why no wiki update is warranted.

## Suggested Procedure

1. Identify the relevant wiki workspace and configured source folders.
2. Search or read relevant notes from configured `sources`, or from explicitly provided evidence paths.
3. Extract claims, questions, patterns, decisions, and tensions.
4. Draft wiki updates with source links. For new wiki pages, use `.wren/templates/wiki.md` as the editable structure and render useful tags through the `{{tags}}` placeholder as Markdown tags.
5. Update or create synthesis pages only after approval.
6. Update the wiki index if useful.
7. Append a concise log entry describing the reflection work.

## Output

Report:

- files read as sources
- wiki files changed
- key synthesis added
- unresolved questions or risks
