# Decision 0005: Separate workflows, deterministic helpers, and support primitives

Status: Accepted

## Context

Wren exposes both agent-guided workflows and deterministic CLI behavior. Early command naming made it easy to blur these categories, especially when Pi adapter aliases and CLI commands shared the `/wren` namespace.

Some operations require agent judgment, reading, and synthesis. Other operations should be scriptable and deterministic. A third set of operations exists only to support workflows safely, such as writing a recap from already-authored stdin content or appending local metric records.

Without a clear taxonomy, support primitives can look like user-facing commands, and deterministic helpers can be mistaken for agent workflows.

## Decision

Use three command categories:

1. Agent workflows guide reasoning, retrieval, synthesis, or writing. In the Pi adapter these are exposed as `/wren recap`, `/wren recall`, and `/wren reflect`.
2. User-facing deterministic helpers are scriptable CLI commands. Selected helpers are also exposed as `/wren ...` adapter aliases, including init, doctor, index, search, lint, and learn review commands.
3. Workflow support commands are low-level primitives used by workflows and adapters. They are CLI-only and are not exposed as `/wren ...` conveniences.

Keep support primitives such as `wren write-recap` and `wren metric` out of the public adapter command surface.

Make lint a deterministic helper instead of an agent workflow. Require authored stdin content for recap storage through `wren write-recap`, so deterministic code handles storage mechanics while the agent remains responsible for authorship.

## Consequences

Benefits:

- clearer API boundaries for users and agents,
- deterministic commands remain testable and scriptable,
- workflow support primitives can be narrow and validation-heavy,
- the adapter help can distinguish workflow requests from CLI-backed aliases,
- recap storage can be deterministic without pretending the CLI authored the summary.

Costs:

- more terminology to document,
- some commands exist in the CLI but intentionally do not appear as `/wren` aliases,
- workflow instructions and adapter help must stay synchronized,
- future commands must be classified before being exposed.

## Revisit When

Reconsider this taxonomy if any of these become true:

- another adapter cannot express the same workflow/helper split,
- users consistently need direct adapter access to support primitives,
- support primitives become safe and meaningful as standalone user commands,
- deterministic helpers need agent mediation for normal use,
- the command surface grows enough to require namespacing beyond the current categories.
