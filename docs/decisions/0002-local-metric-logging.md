# Decision 0002: Metrics use local append-only JSONL

Status: Accepted

## Context

Wren needs a small measurement primitive so future analysis can evaluate whether the capture → reflect → recall loop is useful. The first target metric is reflect-citation rate: whether wiki pages created or updated by reflection are later read during recalls.

This requires recording workflow events, queries, and touched paths, but Wren should not introduce network telemetry, dashboards, aggregation, or content capture as part of the primitive.

## Decision

Add `wren metric` as a local-only CLI helper that appends one JSON object per line to `.wren/cache/metrics.jsonl`.

Metric events are append-only. Wren creates `.wren/cache/` and maintains `.wren/cache/.gitignore` so metric files remain untracked by default.

Metric records may include:

- Wren-stamped `ts`,
- `event`: `recall`, `reflect`, `capture`, or `search`,
- `query`,
- `filesRead`,
- `filesWritten`,
- `area`: `wiki`, `sources`, or `all`.

Metric records store paths and queries only. They must not store file contents.

Wire recall and reflect workflows to log the files they actually read or write. Do not build reporting, aggregation, dashboards, or citation-rate computation yet.

## Consequences

Benefits:

- preserves local-only Wren behavior,
- keeps metric files out of git by default,
- creates enough structured data for later loop-effectiveness analysis,
- keeps the primitive simple and agent-friendly through `--stdin` and repeatable flags,
- avoids premature schema, locking, or reporting infrastructure.

Costs:

- no analysis is available until a future reporting command exists,
- workflow logging depends on agents following the local workflow instructions,
- query/path metadata may still be sensitive even without file contents,
- JSONL schema evolution will need care if later metrics become more complex,
- plain append semantics are suitable for local single-user use but not a robust multi-writer log system.

## Revisit When

Reconsider this design if any of these become true:

- Wren adds `metrics-report` or citation-rate computation,
- metrics need schema versions or migrations,
- users need config to disable or prune local metrics,
- capture/search logging becomes automatic rather than workflow-invoked,
- metric records need additional privacy controls,
- Wren supports shared or multi-user vault workflows where append behavior is insufficient,
- any telemetry leaves the local machine.
