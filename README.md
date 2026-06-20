# Wren

Wren is a Markdown-first protocol for maintaining traceable reflections across a local collection of Markdown files, designed with Obsidian vaults in mind.

It provides a local `wiki/` workspace for indexes, summaries, concept pages, logs, and consolidation proposals derived from your Markdown notes.

The core boundary is simple: source notes are evidence, wiki pages are synthesis, and the LLM is a maintainer rather than an opaque memory store.


## Install from Source

```bash
git clone https://github.com/migsalazar/wren.git
cd wren
npm install
npm run build
npm link
```

## Quickstart

From an Obsidian vault or another Markdown workspace:

```bash
wren init
```

`wren init` creates the local Wren scaffold without overwriting existing files:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/capture.md
.wren/templates/wiki.md
AGENTS.md
wiki/index.md
wiki/log.md
```

When creating `.wren/config.json`, `wren init` detects top-level Markdown folders and lists them as `sources`. It always includes the capture path as a source, skips wiki, hidden, and system folders, and enables local BM25 search with `useBm25`. Review the generated config and remove anything Wren should not use as evidence.

Use Wren through local agent workflows:

```text
/wren capture
/wren recall
/wren reflect
/wren lint
```

A typical capture flow is:

1. Discuss something with an agent inside the vault.
2. Invoke `/wren capture`.
3. Review the proposed capture note.
4. Approve the write to the configured capture area.

A typical reflection flow for existing notes is:

1. Review `.wren/config.json` and confirm the relevant folders are listed in `sources`.
2. Invoke `/wren reflect`.
3. Review the proposed wiki updates and source links.
4. Approve the write to the configured wiki workspace.

Wren does not automatically synthesize notes. Use `/wren reflect` to introduce configured source notes into Wren's wiki synthesis.

The CLI can also create a capture from stdin:

```bash
printf '## Summary\n\nWe clarified the Wren capture workflow.\n' \
  | wren capture --title "Wren capture workflow" --tag wren --stdin
```

Build the local search index and check deterministic health when needed:

```bash
wren index
wren doctor
wren lint
```

`wren doctor` may warn that the configured capture directory is missing until the first capture is created. It also warns when top-level Markdown folders outside wiki, hidden, and system folders are not listed in `sources`, and when BM25 search is enabled but the local search index is missing or stale.

For local development in this repository:

```bash
npm run build
node dist/cli.js --help
npm test
```

## Core Idea

Wren treats Markdown as durable memory.

The LLM can help search, summarize, synthesize, question, and maintain knowledge, but the durable artifacts remain plain files in the vault. The LLM is a maintainer and reflection assistant, not the source of truth.

Wren separates three roles:

```text
configured source folders -> source evidence
wiki workspace            -> Wren-maintained synthesis/output
.wren/                    -> protocol, config, and templates
```

Capture notes are not the privileged source of truth. They are ordinary source notes when the capture path is listed in `sources`; Wren also happens to create captures there.

During recall and reflection, Wren reads from configured `sources` and from files or folders the user explicitly provides for the current task. When `useBm25` is true, recall may use the local `wren search` index as a deterministic retrieval gate. Writes remain constrained: `/wren capture` writes only to the configured capture area, and `/wren reflect` writes only to configured wiki workspaces after approval.

## Local Protocol Files

Wren behavior lives in vault-local files, not global agent skills:

```text
.wren/config.json
.wren/workflows/capture.md
.wren/workflows/recall.md
.wren/workflows/reflect.md
.wren/workflows/lint.md
.wren/templates/capture.md
.wren/templates/wiki.md
AGENTS.md
```

The generated `AGENTS.md` routes namespaced workflow requests to the local workflow files:

```text
/wren capture -> .wren/workflows/capture.md
/wren recall  -> .wren/workflows/recall.md
/wren reflect -> .wren/workflows/reflect.md
/wren lint    -> .wren/workflows/lint.md
```

Templates are intentionally local and editable. For example, the default capture template keeps the title as the first line for Obsidian compatibility.

## Wiki Index and Log

Two wiki files help Wren navigate accumulated synthesis:

- `wiki/index.md` is content-oriented. It catalogs wiki pages with links, one-line summaries, and useful categories or metadata. Recall reads it first, then drills into relevant wiki pages.
- `wiki/log.md` is chronological. It is append-only and records meaningful Wren activity with parseable headings like `## [YYYY-MM-DD] reflect | Title`.

Reflect should update `wiki/index.md` whenever wiki pages are created or meaningfully changed, and append a concise entry to `wiki/log.md`.

## Workflows

### `/wren capture`

Summarize the current agent discussion into a source-level capture note.

Capture is not wiki synthesis. It preserves what happened, including summary, assumptions, disagreements or tensions, and Markdown tags. It writes only to the configured capture area after user approval.

### `/wren recall`

Recover relevant context and relate it to the current discussion.

Recall reads the wiki index first, then relevant wiki pages, then configured source notes only when evidence, detail, freshness, or missing synthesis requires it. If `useBm25` is true, recall may use `wren search` to find candidate wiki/source files before reading them. The goal is useful context and connections, not plain keyword search.

### `/wren reflect`

Turn configured source notes into wiki synthesis.

Use reflect to introduce existing notes into Wren's wiki. Source evidence can include normal vault notes and capture notes when those folders are listed in `sources`. Reflect updates configured wiki workspaces with traceable synthesis. Generated wiki pages require `## Sources`; every meaningful wiki page change should update `wiki/index.md` and append to `wiki/log.md`.

### `/wren lint`

Check Wren workspace health without silently rewriting notes.

The `wren lint` CLI currently checks configured capture/wiki areas for:

- wiki pages without `## Sources`, except `index.md` and `log.md`,
- wiki pages missing from the wiki index,
- empty capture notes,
- empty wiki pages,
- broken relative Markdown links within configured capture/wiki areas,
- broken simple wikilinks by filename or title match.

## CLI Helpers

The CLI supports the local protocol but does not replace the agent workflows.

```bash
wren init
wren index
wren search "query" --area all --limit 10
wren doctor
wren capture --title "Discussion title" --tag wren --stdin
wren lint
```

`wren index` builds a disposable BM25 search cache at `.wren/cache/search-index.json` from configured wiki workspaces and `sources`. `wren search` reads that cache and returns ranked, line-numbered snippets for agents. Markdown files remain the source of truth.

`wren capture` reads the editable vault-local template at `.wren/templates/capture.md`. The `--stdin` body is inserted into that template. Tags are written as Markdown tags in the generated note.

## Current Scope

Wren's first useful version proves the protocol before adding heavier infrastructure.

Current scaffold:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/*.md
AGENTS.md
wiki/index.md
wiki/log.md
```

## Design Principle

Build trust before automation.

Wren should first be reliable at maintaining a simple Markdown boundary: capture notes stay readable, generated synthesis stays inspectable, and useful reflections remain traceable over time.
