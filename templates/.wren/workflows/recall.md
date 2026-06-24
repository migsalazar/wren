# Wren Workflow: /wren recall

Recover relevant Wren context for the current discussion.

## Rules

- Read `.wren/config.json` first.
- Read the configured atlas root's `index.md` first.
- Treat the atlas as compiled synthesis; use sources for evidence, detail, freshness, or missing/thin synthesis.
- Use configured `sources` as the default evidence scope.
- Treat recap notes as ordinary source evidence when the recap path is listed in `sources`.
- Read the configured atlas root and `sources` as needed; read outside them only when the user explicitly provides files or paths.
- If the user specifies or clearly implies an atlas section, prefer atlas pages under that section.
- If `useBm25` is true, use `wren search` before reading broadly.
- If `useBm25` is false, do not use `wren search`; use the atlas index, links, cited sources, and narrow inspection.
- Search configured sources only when atlas synthesis is missing, thin, stale, or needs evidence.
- Do not modify files except appending the local metric log in `.wren/cache/`.
- Prefer concise, cited context over exhaustive results.

## Steps

1. Inspect the configured atlas root's `index.md`.
2. Read likely related atlas pages, preferring a requested or implied atlas section when present.
3. Follow useful atlas links and `## Sources` links when evidence or freshness matters.
4. Use BM25 only as allowed by `useBm25`.
5. Read selected source notes only when needed.
6. Prepare facts, interpretations, tensions, and open questions with file links.
7. Log the recall with `wren metric --event recall --query "<query>"`; repeat `--read <path>` for each file actually read, and include paths only, not content.
8. Return the prepared context.

## Output

- relevant prior context
- files read
- connections or tensions
- open questions
