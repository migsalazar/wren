# Wren Workflow: /wren reflect

Turn configured source notes into source-linked wiki synthesis.

## Rules

- Read `.wren/config.json` first.
- Use configured `sources` as the default evidence scope.
- Treat capture notes as ordinary source evidence when the capture path is listed in `sources`.
- Read outside configured `sources` only when the user explicitly provides files or paths.
- Search before reading broadly; prefer narrow, relevant source files.
- Write synthesis only to configured wiki workspaces.
- Do not rewrite source notes or capture notes unless explicitly asked.
- Generated wiki synthesis pages require `## Sources` with source-note citations.
- Do not create or switch git branches as part of Wren.
- Before writing, determine whether the vault is inside a git repository.
- Git-backed vault: apply clear, minimal wiki/index/log changes directly.
- Non-git vault: show proposed wiki, index, and log changes, then wait for explicit approval.
- Ask before destructive or unusual changes: deleting pages, renaming pages, rewriting large unrelated sections, or writing outside configured wiki workspaces.
- Do not report "no changes" without listing searched/read evidence and why no update is warranted.
- If `useBm25` is true and wiki files changed, run `wren index`; report if the index may be stale.

## Wiki Index

Keep `wiki/index.md` as a concise content catalog. Use this structure unless category sections are more useful:

```md
# Wren Index

## Wiki Pages

- [[page-name]] — one-line summary.
```

- Remove old scaffold prose or empty-state placeholders during the next meaningful update.
- Preserve real catalog entries.
- Update the index when wiki pages are created or meaningfully changed.

## Wiki Log

- Keep `wiki/log.md` concise and append-only.
- Remove old scaffold prose or empty-state placeholders during the next meaningful update.
- Preserve real log entries.
- Append meaningful activity using `## [YYYY-MM-DD] reflect | Title`.

## Steps

1. Identify the relevant wiki workspace and configured sources.
2. Determine git-backed vs non-git write policy.
3. Search or read relevant source evidence.
4. Extract claims, questions, patterns, decisions, and tensions.
5. Draft wiki updates with source links; use `.wren/templates/wiki.md` for new pages.
6. Draft corresponding `wiki/index.md` and `wiki/log.md` updates.
7. Ask approval only when required by the rules.
8. Write wiki, index, and log changes.
9. Refresh BM25 when enabled and wiki files changed.

## Output

- source files read
- wiki files changed
- key synthesis added
- unresolved questions or risks
- index refresh status, when relevant
