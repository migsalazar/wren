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
- If `useBm25` is true, use `wren search` as a deterministic retrieval helper before reading broadly.
- If `useBm25` is false, do not use `wren search`; rely on the wiki index, explicit links, cited sources, and narrow agent-native inspection.
- Search configured sources only when the wiki does not cover the topic, appears stale, or needs source-level evidence.
- Search before reading broadly; prefer a narrow set of relevant files.
- Do not modify files during recall.
- Prefer concise, cited context over exhaustive results.

## Suggested Procedure

1. Inspect the configured default wiki `index.md`.
2. Identify likely related wiki pages by link, one-line summary, category, tags, or source references.
3. Read the relevant wiki pages as the first layer of context.
4. If `useBm25` is true and the index is available, use `wren search --area wiki` when the wiki index is too thin to route confidently.
5. Follow useful wiki links and `## Sources` links when the answer needs evidence, detail, freshness, or disputed-claim checks.
6. If `useBm25` is true, use `wren search --area sources` only when wiki synthesis is missing, thin, stale, or insufficiently sourced.
7. If `useBm25` is false, inspect configured sources only through narrow paths, explicit links, or user-provided scope.
8. Read selected source notes only when needed.
9. Return a concise context summary with links to the files used.
10. Distinguish facts, interpretations, and open questions.

## Output

Include:

- relevant prior context
- related files read
- possible connections or tensions
- open questions worth revisiting
