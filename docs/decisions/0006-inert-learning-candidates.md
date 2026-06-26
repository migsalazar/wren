# Decision 0006: Learning candidates are inert and never auto-promoted

Status: Accepted

## Context

Wren workflows may reveal reusable improvements to future Wren behavior. For example, recap or reflect may notice a better workflow instruction, validation rule, or local convention.

Automatically turning these observations into active instructions would be risky. It could let a single workflow run silently change future agent behavior, mix derived metadata with user note content, or promote low-quality suggestions without review.

The MVP needs a way to preserve possible improvements without granting them authority.

## Decision

Allow recap and reflect workflows to save at most one learning candidate under `.wren/cache/learning/candidates/` when they notice a reusable Wren workflow improvement.

Learning candidates are inert metadata. They are not note content, are not active rules, and are never promoted automatically.

Normal workflows do not read learning candidates as instructions. Users review or remove candidates explicitly through deterministic commands such as `wren learn list`, `wren learn show <id>`, and `wren learn drop <id>`.

## Consequences

Benefits:

- preserves potentially useful workflow improvements,
- avoids silent self-modification of agent behavior,
- keeps user notes separate from derived workflow metadata,
- makes review and deletion explicit,
- allows doctor to report pending or invalid candidates without enforcing them.

Costs:

- useful improvements require manual review before becoming active,
- candidates can accumulate if users ignore them,
- MVP learning has no automatic feedback loop,
- docs and workflow templates must be clear that candidates have no authority.

## Revisit When

Reconsider this design if any of these become true:

- Wren adds an explicit promotion command,
- candidates need approval workflows or provenance metadata,
- teams need shared review of learning candidates,
- stale candidates become noisy in normal doctor output,
- Wren supports stronger policy mechanisms for safely activating reviewed learning.
