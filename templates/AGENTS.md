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

- Wren areas are configured in `.wren/config.json`.
- Wren only has write permission in folders it knows through configuration.
- The capture area is source material managed by Wren with user approval.
- Wiki workspaces are generated synthesis.
- Do not read outside configured Wren areas unless the user explicitly provides additional files or paths for the current task.
- Do not rewrite notes unless explicitly asked.
- Do not write outside configured Wren areas.

## Workflow Summary

- `/wren capture`: summarize the current agent discussion into the configured capture area as source-level memory.
- `/wren recall`: search wiki first, then configured or explicitly provided evidence as needed, and relate useful context to the current discussion.
- `/wren reflect`: update wiki synthesis from cited evidence.
- `/wren lint`: report structure/link/source issues without silently rewriting notes.

## Wiki Rules

- `wiki/log.md` is append-only.
- Generated wiki synthesis pages require `## Sources`.
- Keep `wiki/index.md` concise and useful.
