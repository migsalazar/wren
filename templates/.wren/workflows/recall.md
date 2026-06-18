# Wren Workflow: /wren recall

Use this workflow when the user invokes `/wren recall` inside a Wren vault.

## Purpose

Recover relevant context from the Wren vault and relate it to the current discussion.

Recall is not plain keyword search. The agent should look for useful connections, prior decisions, related captures, tensions, and synthesis.

## Rules

- Read `.wren/config.json` before recalling.
- Search wiki workspaces first.
- Use configured capture notes and wiki sources only when needed for evidence or detail.
- Do not read outside configured Wren areas unless the user explicitly provides additional files or paths for the current task.
- Do not modify files during recall.
- Prefer concise, cited context over exhaustive results.

## Suggested Procedure

1. Inspect the configured default wiki index.
2. Identify likely related wiki pages by title, links, tags, or source references.
3. Follow useful backlinks, tags, and source links.
4. Read selected capture notes or explicitly provided evidence only when needed.
5. Return a concise context summary with links to the files used.
6. Distinguish facts, interpretations, and open questions.

## Output

Include:

- relevant prior context
- related files read
- possible connections or tensions
- open questions worth revisiting
