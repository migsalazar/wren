# Wren

**WREN: Worldview, Reflection, Experience, Notes.**

Wren is a personal reflection protocol for an Obsidian vault.

It uses an opinionated, local-first LLM-wiki pattern: Markdown notes remain durable evidence, while an LLM agent maintains a generated `wiki/` workspace for indexes, logs, concept pages, summaries, and consolidation proposals.

The goal is not to build a general wiki or an opaque memory store. The goal is to preserve a traceable, evolving worldview from experience and notes inside the vault you already use.

> What remains after experience and noise.

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

The CLI can also create a capture from stdin:

```bash
printf '## Summary\n\nWe clarified the Wren capture workflow.\n' \
  | wren capture --title "Wren capture workflow" --tag wren --stdin
```

Check deterministic health when needed:

```bash
wren doctor
wren lint
```

`wren doctor` may warn that the configured capture directory is missing until the first capture is created.

For local development in this repository:

```bash
npm install
npm run build
node dist/cli.js --help
npm test
```

## Core Idea

Wren treats Markdown as durable memory.

The LLM can help search, summarize, synthesize, question, and maintain knowledge, but the durable artifacts remain plain files in the vault. The LLM is a maintainer and reflection assistant, not the source of truth.

Wren separates three kinds of files:

```text
capture area -> written as source-level memory
wiki workspace -> written as reviewed synthesis
other vault files -> untouched unless explicitly allowed
```

Wren only operates in folders it knows through `.wren/config.json`. By default, that means the configured capture area and wiki workspace. Other vault folders remain the user's responsibility unless explicitly configured or provided for a task.

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

## Workflows

### `/wren capture`

Summarize the current agent discussion into a source-level capture note.

Capture is not wiki synthesis. It preserves what happened, including summary, assumptions, disagreements or tensions, conversation metadata, and Markdown tags. It writes only to the configured capture area after user approval.

### `/wren recall`

Recover relevant context and relate it to the current discussion.

Recall searches the wiki first, then reads configured capture notes or explicitly provided evidence only when needed. The goal is useful context and connections, not plain keyword search.

### `/wren reflect`

Turn capture notes or explicitly provided evidence into wiki synthesis.

Reflect updates configured wiki workspaces with traceable synthesis. Generated wiki pages require `## Sources`; meaningful activity should be appended to `wiki/log.md`.

### `/wren lint`

Check Wren workspace health without silently rewriting notes.

The `wren lint` CLI currently checks configured Wren areas for:

- wiki pages without `## Sources`, except `index.md` and `log.md`,
- wiki pages missing from the wiki index,
- empty capture notes,
- empty wiki pages,
- broken relative Markdown links within configured Wren areas,
- broken simple wikilinks by filename or title match.

## CLI Helpers

The CLI supports the local protocol but does not replace the agent workflows.

```bash
wren init
wren doctor
wren capture --title "Discussion title" --tag wren --stdin
wren lint
```

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

See [docs/mvp.md](docs/mvp.md) for detailed MVP scope, current CLI helpers, near-term tooling, and non-goals.

## Design Principle

Build trust before automation.

Wren should first be reliable at maintaining a simple Markdown boundary: capture notes stay readable, generated synthesis stays inspectable, and useful reflections remain traceable over time.
