# Decision 0001: Pi adapter uses minimal structural types for MVP

Status: Accepted

## Context

The Pi `/wren` adapter is intended to be a thin host integration over Wren's portable core:

- local Wren protocol files in `.wren/workflows/*.md`,
- deterministic CLI helpers exposed by `wren`,
- vault-local configuration in `.wren/config.json`.

For the MVP, the Pi adapter only needs a small subset of the Pi extension API:

- register the `/wren` command,
- send an agent message for workflow commands,
- show basic UI notifications or confirmations,
- run bundled CLI helpers for deterministic commands.

Importing official Pi types from `@earendil-works/pi-coding-agent` would add dependency and lockfile surface before the adapter needs deeper Pi integration.

## Decision

Use local minimal structural TypeScript interfaces for the initial Pi adapter.

Do not add `@earendil-works/pi-coding-agent` as a dependency yet.

## Consequences

Benefits:

- fewer dependencies,
- less coupling to Pi internals,
- easier package installation,
- sufficient type coverage for a thin wrapper.

Costs:

- weaker compile-time protection against Pi API changes,
- possible drift from the actual Pi extension API,
- less autocomplete and documentation for advanced Pi features,
- higher risk if the adapter grows beyond a small wrapper.

## Revisit When

Add official Pi types as a development dependency, and likely declare a Pi peer dependency, if any of these become true:

- the adapter registers custom tools,
- the adapter uses custom UI components, autocomplete providers, renderers, or session APIs,
- the adapter depends on more than a small subset of Pi APIs,
- runtime compatibility issues appear across Pi versions,
- Wren publishes a separately maintained `wren-adapter-pi` package,
- Pi adapter behavior becomes complex enough that structural local types are risky.
