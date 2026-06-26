# Decision 0003: Use local BM25 search as the MVP retrieval primitive

Status: Accepted

## Context

Recall and reflect need a deterministic way to find relevant Markdown files and snippets across configured Wren sources and atlas content.

The MVP should stay local-first and avoid requiring network services, embedding providers, vector databases, or telemetry. Search results should be inspectable by agents and users, with enough path and line context to support grounded reading.

## Decision

Add a local BM25 search index under `.wren/cache/search-index.json` and expose deterministic indexing and search through `wren index` and `wren search`.

Search operates over configured Wren areas, including source notes and atlas content. Results include ranked, line-numbered snippets so agents can decide which files to read next.

Keep the search index local and derived. It may be refreshed by workflows when BM25 is enabled, and cache files remain outside normal note content.

Do not add embeddings, remote search, or external retrieval services for the MVP.

## Consequences

Benefits:

- preserves local-only Wren behavior,
- gives workflows deterministic retrieval support,
- avoids external service dependencies and API keys,
- produces transparent path and line-numbered evidence for agents,
- keeps search data derived and cache-scoped.

Costs:

- lexical search can miss semantic matches,
- ranking quality depends on tokenization and source text,
- users may need to refresh the index after content changes,
- cache schema changes may require rebuilds,
- BM25 does not replace agent judgment or source reading.

## Revisit When

Reconsider this design if any of these become true:

- recall quality is limited by lexical matching,
- users request semantic retrieval or hybrid search,
- search needs incremental indexing or larger-vault performance work,
- cache schema versioning becomes necessary,
- Wren supports optional external providers while preserving local-first defaults.
