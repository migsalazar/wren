# Wren MVP Scope

The first useful version should prove the protocol, not the infrastructure.

## Minimum Vault Artifacts

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/capture.md
.wren/templates/wiki.md
AGENTS.md
wiki/index.md
wiki/log.md
wiki/*.md
```

## Minimum Behavior

- Define the capture area and writable wiki workspaces.
- Read configured Wren areas as evidence.
- Write capture notes only to the configured capture area.
- Write generated synthesis only to configured wiki workspaces.
- Keep `wiki/index.md` useful.
- Append meaningful activity to `wiki/log.md`.
- Support `/wren capture`, `/wren recall`, `/wren reflect`, and `/wren lint` workflows.
- Keep capture and wiki page formats editable through local Wren templates.
- Use deterministic scripts for checks where scripts are better than agents.

## Current CLI Helpers

- `wren init` scaffolds local Wren files without overwriting existing files.
- `wren doctor` checks the scaffold and configured paths.
- `wren capture --stdin` creates a capture note from provided content.
- `wren lint` checks configured Wren areas for deterministic content issues.

## Near-Term Tooling

- richer lint reports,
- recall/search helpers,
- reflection workflow helpers,
- deterministic fix proposals,
- optional integrations with external local search tools.

## Non-Goals for the MVP

- No opaque memory store.
- No global agent skills required.
- No automatic mutation of non-Wren notes.
- No mandatory migration of an existing Obsidian vault.
- No semantic rewrite or synthesis without user review.
