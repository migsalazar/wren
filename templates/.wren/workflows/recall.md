# Wren Workflow: /wren recall

Use this workflow when the user invokes `/wren recall` inside a Wren vault.

## Purpose

Recover relevant context from the Wren vault and relate it to the current discussion.

Recall is not plain keyword search. The agent should look for useful connections, prior decisions, related source notes, tensions, and synthesis.

## Rules

- Read `.wren/config.json` before recalling.
- Search wiki workspaces first.
- Use configured `sources` as the default evidence scope.
- Treat capture notes as ordinary source evidence when the capture path is listed in `sources`.
- If the user provides note files or folders outside configured `sources`, treat them as explicitly provided evidence for the current task.
- Do not read outside configured `sources` unless the user explicitly provides additional files or paths for the current task.
- Use source notes only when needed for evidence or detail.
- Search before reading broadly; prefer a narrow set of relevant files.
- Do not modify files during recall.
- Prefer concise, cited context over exhaustive results.

## Suggested Procedure

1. Inspect the configured default wiki index.
2. Identify likely related wiki pages by title, links, tags, or source references.
3. Follow useful backlinks, tags, and source links.
4. Search configured source folders when wiki synthesis is missing, thin, or needs evidence.
5. Read selected source notes only when needed.
6. Return a concise context summary with links to the files used.
7. Distinguish facts, interpretations, and open questions.

## Output

Include:

- relevant prior context
- related files read
- possible connections or tensions
- open questions worth revisiting
