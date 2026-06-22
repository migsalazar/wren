# Wren Workflow: /wren recall

Recover relevant Wren context for the current discussion.

## Rules

- Read `.wren/config.json` first.
- Read the configured default wiki `index.md` first.
- Treat the wiki as compiled synthesis; use sources for evidence, detail, freshness, or missing/thin synthesis.
- Use configured `sources` as the default evidence scope.
- Treat capture notes as ordinary source evidence when the capture path is listed in `sources`.
- Read outside configured `sources` only when the user explicitly provides files or paths.
- If `useBm25` is true, use `wren search` before reading broadly.
- If `useBm25` is false, do not use `wren search`; use the wiki index, links, cited sources, and narrow inspection.
- Search configured sources only when wiki synthesis is missing, thin, stale, or needs evidence.
- Do not modify files.
- Prefer concise, cited context over exhaustive results.

## Steps

1. Inspect the default wiki `index.md`.
2. Read likely related wiki pages.
3. Follow useful wiki links and `## Sources` links when evidence or freshness matters.
4. Use BM25 only as allowed by `useBm25`.
5. Read selected source notes only when needed.
6. Return facts, interpretations, tensions, and open questions with file links.

## Output

- relevant prior context
- files read
- connections or tensions
- open questions
