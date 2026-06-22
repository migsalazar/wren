# Wren Workflow: /wren lint

Inspect Wren vault health and report deterministic issues.

## Rules

- Read `.wren/config.json` first.
- Inspect configured capture and wiki areas by default.
- Inspect configured source folders only when a check covers sources or the user asks.
- Inspect outside configured Wren areas/sources only when the user explicitly provides files or paths.
- Do not silently rewrite notes.
- Do not modify non-Wren notes except through explicit, deterministic, approved fixes.
- Keep deterministic findings separate from semantic judgments.

## Checks

Run available deterministic checks, such as `wren doctor` and `wren lint`. Report supported findings including:

- missing Wren scaffold files
- broken markdown links or wikilinks
- empty capture notes or wiki pages
- wiki synthesis pages without `## Sources`, excluding `index.md` and `log.md`
- wiki synthesis pages missing from `wiki/index.md`, excluding `index.md` and `log.md`

If doing manual or future checks, label them clearly; examples include duplicate titles, missing title headings, very short notes, or tag hygiene.

## Steps

1. Run deterministic checks where available.
2. Inspect only the files needed to explain findings.
3. Report findings by severity.
4. Propose exact deterministic fixes when useful.
5. Wait for approval before modifying files.
