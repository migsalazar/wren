# Wren Workflow: /wren reflect

Use this workflow when the user invokes `/wren reflect` inside a Wren vault.

## Purpose

Turn capture notes or explicitly provided evidence into wiki synthesis.

Reflection maintains what Wren understands. It is deeper than capture and should remain traceable to evidence.

## Rules

- Read `.wren/config.json` before reflecting.
- Read configured capture notes and explicitly provided files as evidence.
- Do not read outside configured Wren areas unless the user explicitly provides additional files or paths for the current task.
- Write synthesis only to configured wiki workspaces.
- Do not rewrite evidence or capture notes unless the user explicitly asks.
- Generated wiki synthesis pages require a `## Sources` section.
- Keep `wiki/index.md` concise and useful.
- Append meaningful activity to `wiki/log.md`; do not rewrite prior log entries.
- Show proposed wiki changes before writing and wait for approval.

## Suggested Procedure

1. Identify the relevant wiki workspace.
2. Read relevant capture notes or explicitly provided evidence.
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
