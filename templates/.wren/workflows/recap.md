# Wren Workflow: /wren recap

Summarize the current agent discussion and save it as a source-level recap note.

## Inputs

The user may provide a title, tags, or preservation instructions. If missing, choose a concise title and a small set of relevant tags.

## Rules

- Read `.wren/config.json` first.
- Write the recap note only to the configured recap area. If the user explicitly specifies a subfolder, it must stay inside that recap area.
- Do not update atlas pages or the configured atlas root's `index.md` or `log.md`.
- Do not write outside the recap area except derived `.wren/cache/` updates explicitly permitted by this workflow, such as search-index updates when BM25 is enabled or inert learning candidates.
- Preserve source-level memory: summary, key decisions, important context, assumptions, disagreements/tensions, open questions, and Markdown tags.
- After any required approval, use `wren write-recap --title "<title>" --tag "<tag>" --stdin` to store already-authored recap content deterministically.
- `wren write-recap` does not summarize; it only writes the recap content you provide using `.wren/templates/recap.md`.
- If the Wren CLI helper is unavailable, report that the Wren CLI is required to save the recap deterministically.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- Git-backed vault: write directly.
- Non-git vault: show the proposed title, target recap area, and proposed content, then wait for explicit approval.
- If the recap area does not exist, report that Wren created it or include that fact in the non-git approval prompt.
- If `useBm25` is true, ensure the search index is refreshed after writing; report if it may be stale.
- Learning candidates are derived workflow metadata, never recap content. Do not add learning sections, candidate notes, or reusable-rule commentary to the recap note.
- After the recap is saved and normal reporting is complete, you may write at most one high-signal inert learning candidate to `.wren/cache/learning/candidates/<id>.md` when the session reveals a reusable Wren workflow improvement. Before writing a candidate, ensure `.wren/cache/.gitignore` exists with exactly `*\n!.gitignore\n` so candidates remain derived cache files.
- Passive candidate capture must never modify recap notes, atlas pages, `.wren/workflows/`, `.wren/templates/`, `AGENTS.md`, or other instruction surfaces.
- A candidate must include frontmatter with `id`, `status: candidate`, `scope: vault`, `domain`, `confidence`, `created`, `trigger`, non-empty `evidence`, and non-empty `suggested_targets` limited to `.wren/workflows/*.md`, `.wren/templates/*.md`, `AGENTS.md`, or `.wren/learning/*.md`.

## Steps

1. Read config and identify the recap path.
2. Determine git-backed vs non-git write policy.
3. Draft the recap content from the current conversation.
4. Ask approval only when required by the rules.
5. After approval, save the recap with `wren write-recap`, passing the drafted content on stdin.
6. Confirm BM25 was refreshed when enabled.
7. Optionally save one inert cache-only learning candidate if the run exposed a reusable Wren workflow improvement and the candidate has concrete evidence plus a suggested target; ensure `.wren/cache/.gitignore` exists first.
8. Report the created recap path and any index warning. Do not include learning-candidate content in the recap.
