# Wren Workflow: /wren lint

Use this workflow when the user invokes `/wren lint` inside a Wren vault.

## Purpose

Inspect Wren vault health and note hygiene. Report issues clearly and propose deterministic fixes when appropriate.

Lint is primarily read-only unless the user explicitly approves a fix.

## Rules

- Read `.wren/config.json` before linting.
- Inspect configured Wren areas by default.
- Do not inspect outside configured Wren areas unless the user explicitly provides additional files or paths for the current task.
- Do not silently rewrite notes.
- Do not modify non-Wren notes except through explicit, deterministic, approved fixes.
- Prefer reports and proposals over automatic changes.
- Keep semantic judgments separate from deterministic findings.

## Possible Checks

- missing Wren scaffold files
- broken markdown links or wikilinks
- empty notes
- notes without title headings
- notes without tags, if tags become required
- duplicate titles
- very short notes that may need review
- wiki pages without `## Sources`
- wiki pages missing from the wiki index

## Suggested Procedure

1. Run deterministic checks where available, such as `wren doctor` and `wren lint`.
2. Inspect relevant files only as needed.
3. Report findings grouped by severity.
4. For fixable issues, propose exact deterministic changes.
5. Wait for user approval before modifying files.
