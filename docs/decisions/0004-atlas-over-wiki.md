# Decision 0004: Use a sectioned atlas instead of a wiki model

Status: Accepted

## Context

Wren maintains traceable notes across local Markdown files. Early terminology and scaffolds used a `wiki/` model for synthesized notes.

That term was too broad for Wren's intended role. A wiki can imply a general-purpose knowledge base where synthesized pages become primary truth. Wren instead needs a source-linked synthesis workspace that remains grounded in configured source notes and conversation recaps.

Wren also needs a way to route synthesis from different source folders into predictable areas without requiring users to maintain many independent knowledge systems.

## Decision

Replace the user-facing wiki model with a sectioned atlas model.

Use one configured atlas root at `areas.atlas.path`, with an `areas.atlas.defaultSection` fallback. Each configured source can optionally declare an `atlasSection` that routes reflection output under the atlas root.

Treat the atlas as source-linked synthesis, not canonical source evidence. Recall reads the atlas index first, then atlas pages and source evidence as needed. Reflect writes synthesis under the selected or inferred atlas section and updates the atlas root's `index.md` and `log.md`.

Reflect routing uses source-to-section mapping when possible and asks before writing when the target section is ambiguous.

## Consequences

Benefits:

- clearer product language than a generic wiki,
- reinforces that source notes remain evidence,
- supports one atlas root with multiple source-routed sections,
- gives recall a stable synthesis entry point through `atlas/index.md`,
- lets lint, doctor, search, and metrics reason about source and atlas boundaries.

Costs:

- users familiar with wiki terminology must migrate mentally and structurally,
- configuration is more explicit because sources may need section mappings,
- reflect must handle ambiguous routing instead of always writing to one flat area,
- docs, templates, tests, and adapter help must stay aligned with atlas terminology.

## Revisit When

Reconsider this design if any of these become true:

- users need multiple independent atlas roots,
- atlas sections need richer metadata than path-based routing,
- reflect needs to write across several atlas sections in one operation,
- source evidence and synthesis boundaries become unclear in practice,
- another term better communicates source-linked synthesis without implying canonical truth.
