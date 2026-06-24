# Wren Workflow: /wren reflect

Turn configured source notes into source-linked atlas synthesis.

## Rules

- Read `.wren/config.json` first.
- Use configured `sources` as the default evidence scope.
- Treat recap notes as ordinary source evidence when the recap path is listed in `sources`.
- Read the configured atlas root and `sources` as needed; read outside them only when the user explicitly provides files or paths.
- Search before reading broadly; prefer narrow, relevant source files.
- Write synthesis only under the configured atlas root, usually under a selected atlas section.
- Do not rewrite source notes or recap notes unless explicitly asked.
- Generated atlas synthesis pages require `## Sources` with source-note citations.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- Git-backed vault: apply clear, minimal atlas/index/log changes directly.
- Non-git vault: show proposed atlas, index, and log changes, then wait for explicit approval.
- Ask before destructive or unusual changes: deleting pages, renaming pages, rewriting large unrelated sections, or writing outside the configured atlas root.
- Do not report "no changes" without listing searched/read evidence and why no update is warranted.
- If `useBm25` is true and atlas files changed, ensure the search index is refreshed; report if it may be stale.

## Atlas Section Routing

Choose the target atlas section before drafting new or moved synthesis pages:

1. If the user explicitly specifies a target atlas section, use it.
2. Otherwise, map each source evidence file to the longest matching configured source path.
3. Treat a mapped source without `atlasSection` as mapped to `areas.atlas.defaultSection`.
4. If all mapped source paths resolve to the same section, use that section.
5. If the evidence maps to multiple sections or the target is ambiguous, ask before writing.
6. If no mapping applies, use `areas.atlas.defaultSection`.

Write sectioned synthesis under `areas.atlas.path/<section>/`. If a page is clearly global or cross-domain, ask whether it belongs in a specific section or the default section.

## Atlas Index

Keep the configured atlas root's `index.md` as a concise global content catalog. Use section headings when useful:

```md
# Wren Atlas

## Section Name

- [[section/page-name]] — one-line summary.
```

- Remove old scaffold prose or empty-state placeholders during the next meaningful update.
- Preserve real catalog entries.
- Update the index when atlas pages are created or meaningfully changed.

## Atlas Log

- Keep the configured atlas root's `log.md` concise and append-only.
- Remove old scaffold prose or empty-state placeholders during the next meaningful update.
- Preserve real log entries.
- Append meaningful activity using `## [YYYY-MM-DD] reflect | Title`.

## Steps

1. Identify the selected atlas section and configured sources.
2. Determine git-backed vs non-git write policy.
3. Search or read relevant source evidence.
4. Extract claims, questions, patterns, decisions, and tensions.
5. Draft atlas updates with source links; use `.wren/templates/atlas.md` for new pages.
6. Draft corresponding configured atlas root `index.md` and `log.md` updates.
7. Ask approval only when required by the rules.
8. Write atlas, index, and log changes.
9. Log the reflection with `wren metric --event reflect`; repeat `--write <path>` for each atlas page created/updated, and include paths only, not content.
10. Ensure BM25 is refreshed when enabled and atlas files changed.

## Output

- source files read
- atlas files changed
- selected atlas section
- key synthesis added
- unresolved questions or risks
- index refresh status, when relevant
