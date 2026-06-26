# Decision 0007: Use narrow vault write scopes with git-aware safety

Status: Accepted

## Context

Wren operates inside local Markdown workspaces, commonly Obsidian vaults. These vaults may contain personal notes, source evidence, and Wren-maintained protocol files.

Agent workflows need to write useful outputs, but broad or surprising writes are risky. The risk is higher in non-git vaults because users may not have an easy way to review or revert changes.

Wren also should not take over repository workflow concerns such as branch creation or branch switching inside a user's vault.

## Decision

Use narrow write scopes for Wren workflows.

- Recap writes recap notes and derived `.wren/cache/` files.
- Recall may append path/query-only metrics to `.wren/cache/metrics.jsonl`.
- Reflect writes configured atlas files and derived `.wren/cache/` files.
- Wren edits `.wren/config.json`, workflows, or templates only when explicitly requested.

Agent workflow writes may proceed directly in git-backed vaults. In non-git vaults, Wren asks before writing. Wren also asks before destructive, unusual, or out-of-boundary changes.

Wren does not create or switch git branches for the user's vault. Direct CLI commands execute as requested.

## Consequences

Benefits:

- limits accidental edits to predictable areas,
- keeps workflow behavior understandable and reviewable,
- uses git presence as a practical reversibility signal,
- avoids surprising branch management in user vaults,
- preserves a distinction between workflow writes and explicit CLI actions.

Costs:

- non-git vaults require extra confirmation before workflow writes,
- git-backed vaults can still receive unwanted edits if instructions are wrong,
- Wren relies on workflow instructions and adapter behavior to enforce boundaries,
- users must manage their own branches, commits, and backups.

## Revisit When

Reconsider this policy if any of these become true:

- Wren gains built-in dry-run or patch preview support,
- adapters can reliably stage or present vault diffs before writes,
- users need Wren-managed branch or snapshot workflows,
- workflow write scopes expand beyond recap, recall metrics, and atlas synthesis,
- non-git vault usage becomes common enough to require a different confirmation model.
