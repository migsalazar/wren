# Wren Workflow: /wren recall

Use this workflow when the user invokes `/wren recall` inside a Wren vault.

## Purpose

Recover relevant context from the Wren vault and relate it to the current discussion.

Recall is not plain keyword search. The agent should look for useful connections, prior decisions, related source notes, tensions, and synthesis.

## Rules

- Read `.wren/config.json` before recalling.
- Read the configured default wiki `index.md` first.
- Use the wiki as compiled synthesis; source notes are for evidence, detail, freshness checks, or missing/thin synthesis.
- Use configured `sources` as the default evidence scope.
- Treat capture notes as ordinary source evidence when the capture path is listed in `sources`.
- If the user provides note files or folders outside configured `sources`, treat them as explicitly provided evidence for the current task.
- Do not read outside configured `sources` unless the user explicitly provides additional files or paths for the current task.
- Search configured sources only when the wiki does not cover the topic, appears stale, or needs source-level evidence.
- Search before reading broadly; prefer a narrow set of relevant files.
- Do not modify files during recall.
- Prefer concise, cited context over exhaustive results.

## Suggested Procedure

1. Inspect the configured default wiki `index.md`.
2. Identify likely related wiki pages by link, one-line summary, category, tags, or source references.
3. Read the relevant wiki pages as the first layer of context.
4. Follow useful wiki links and `## Sources` links when the answer needs evidence, detail, freshness, or disputed-claim checks.
5. Search configured source folders only when wiki synthesis is missing, thin, stale, or insufficiently sourced.
6. Read selected source notes only when needed.
7. Return a concise context summary with links to the files used.
8. Distinguish facts, interpretations, and open questions.

## Output

Include:

- relevant prior context
- related files read
- possible connections or tensions
- open questions worth revisiting
