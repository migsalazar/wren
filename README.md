# Wren

**WREN: Worldview, Reflection, Experience, Notes.**

Wren is a personal reflection protocol for an Obsidian vault.

It uses an opinionated, local-first LLM-wiki pattern: raw Markdown notes remain source evidence, while an LLM agent maintains a generated `wiki/` workspace for indexes, logs, drafts, concept pages, summaries, and consolidation proposals.

The goal is not to build a general wiki or an opaque memory store. The goal is to preserve a traceable, evolving worldview from experience and notes inside the vault you already use.

> What remains after experience and noise.

## Quickstart

From an Obsidian vault or another Markdown workspace:

```bash
wren init
wren doctor
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

Use Wren through the local agent workflows:

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

Check deterministic health at any time:

```bash
wren doctor
wren lint
```

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

Wren is organized around four ideas:

- **Worldview** — the evolving synthesis: reviewed concepts, summaries, decisions, questions, and patterns.
- **Reflection** — the LLM-assisted work of interpreting, connecting, and refining notes.
- **Experience** — raw source material: work notes, writing, book notes, discussions, observations, and daily capture.
- **Notes** — the Markdown artifacts that make the system inspectable and portable.

## Vault Shape Hypothesis

Wren should adapt to an existing Obsidian vault rather than requiring a full migration.

A typical vault may look like this:

```text
Obsidian vault/
  AGENTS.md
  notes/
  projects/
  writing/
  books/
  attachments/
  templates/
  wiki/
    index.md
    log.md
    *.md
```

Wren only operates in folders it knows through `.wren/config.json`. By default, that means the configured capture area and wiki workspace. Other vault folders remain the user's responsibility unless explicitly configured or provided for a task.

The important boundary is:

```text
capture area -> written as source-level memory
wiki workspace -> written as synthesis
other vault files -> untouched unless explicitly allowed
```

## Configurable Workspaces

Wren should not assume that all retained knowledge belongs in one global wiki.

A vault may use one shared workspace:

```text
wiki/
  index.md
  log.md
  *.md
```

Or separate configured workspaces:

```text
wiki/
  personal/
  work/
  writing/
```

The protocol should allow Wren to write to the appropriate configured workspace for the current task. This keeps work, personal reflection, writing, and other contexts from being mixed accidentally.

## Architecture

Wren has four layers:

```text
Capture / Configured Evidence
  -> cited by
Wiki Workspace
  -> structured by
Local Agent Workflows
  -> checked by
Deterministic Scripts
```

The LLM handles work that requires judgment:

- summarization,
- synthesis,
- discussion recap,
- concept refinement,
- contradiction detection,
- deciding what is worth preserving.

Scripts handle work that should be deterministic:

- lint checks,
- missing-file checks,
- broken-link checks,
- index consistency,
- source reference checks,
- hygiene reports.

The system should work first as plain Markdown plus local `AGENTS.md` instructions. Workflow behavior is stored in Wren-local protocol files under `.wren/workflows/`; it should not require global agent skills.

## Core Workflows

Wren's current workflow invocations are `/wren capture`, `/wren recall`, `/wren reflect`, and `/wren lint`.

They are defined as local workflow files scaffolded into `.wren/workflows/` and routed through the vault-local `AGENTS.md`. The important distinction is that `/wren capture` writes source-level memory to the configured capture area, while `/wren reflect` writes wiki synthesis.

### `/wren capture`

Summarize experience into source Markdown.

A capture workflow turns a discussion, meeting, thought, or source into a durable Markdown summary in the configured capture area. It may include important bullet points, decisions, context, open questions, next actions, and things worth remembering.

Capture is synthesis, but it is source-level synthesis. It preserves what happened so it can be used later.

Capture may be preceded by Socratic discussion: the agent asks clarifying questions, challenges assumptions constructively, surfaces tradeoffs, separates decisions from open questions, and then summarizes the discussion into source Markdown when asked.

### `/wren recall`

Read, search, and summarize existing context.

A recall workflow searches the wiki first, then reads configured capture notes or explicitly provided evidence only when needed and allowed. It is useful for orientation, answering questions, and recovering past decisions or reasoning from Wren-managed context.

### `/wren reflect`

Turn capture notes or explicitly provided evidence into wiki synthesis.

A reflect workflow reads configured capture notes or explicitly provided evidence, identifies useful claims, questions, patterns, and tensions, then creates or updates wiki artifacts with source links. It usually updates `wiki/index.md` and appends meaningful activity to `wiki/log.md`.

Reflect is deeper than capture: it maintains what Wren understands, not just what happened. It may become a longer-running or background workflow later.

### `/wren lint`

Check the health of the Wren workspace.

A lint workflow should be script-assisted where possible. Deterministic linting is useful now; semantic or background linting can grow over time.

The `wren lint` CLI currently checks configured Wren areas for:

- wiki pages without `## Sources`, except `index.md` and `log.md`,
- wiki pages missing from the wiki index,
- empty capture notes,
- empty wiki pages,
- broken relative Markdown links within configured Wren areas,
- broken simple wikilinks by filename or title match.

The broader `/wren lint` workflow may later check additional structural issues:

- missing source references,
- note format issues,
- missing or malformed frontmatter,
- title/heading mismatches.

It may also propose knowledge-maintenance work:

- contradiction notes,
- reviewed concept pages,
- saved query pages,
- source summaries,
- worldview or overview summaries,
- consolidation proposals,
- stale claim detection,
- duplicate concept detection.

These checks should remain reviewable. Wren may propose; humans decide. `/wren lint` may report issues, stage normalized versions, or generate patch proposals, but it should not silently rewrite notes.

## MVP Scope

The first useful version should prove the protocol, not the infrastructure.

Minimum vault artifacts:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/capture.md
.wren/templates/wiki.md
AGENTS.md
wiki/index.md
wiki/log.md
wiki/*.md
```

Minimum behavior:

- define the capture area and writable wiki workspaces,
- read configured Wren areas as evidence,
- write generated synthesis only to configured wiki workspaces,
- keep `index.md` useful,
- append meaningful activity to `log.md`,
- support `/wren capture`, `/wren recall`, `/wren reflect`, and `/wren lint` workflows,
- keep capture and wiki page formats editable through local Wren templates,
- use deterministic scripts for checks where scripts are better than agents.

Near-term tooling may include:

- initialization,
- linting,
- hygiene reports,
- recall/search helpers,
- capture helpers,
- reflection workflow helpers.

## CLI Helpers

The CLI supports the local protocol but does not replace the agent workflows.

```bash
wren init
wren doctor
wren capture --title "Discussion title" --tag wren --stdin
wren lint
```

`wren capture` reads the editable vault-local template at `.wren/templates/capture.md`. The `--stdin` body is inserted into that template. Tags are written as Markdown tags in the generated note.

## Current Boundaries

Wren currently starts with Markdown, Obsidian, local agent instructions, local workflow files, and deterministic scripts.

Larger interfaces, indexes, catalogs, source manifests, embeddings, bots, and richer automation can be added when the basic workflow is trustworthy.

Non-Wren note mutation should remain explicit and reviewed. Hygiene tooling may report issues or stage proposals, but it should not silently rewrite notes.

## Design Principle

Build trust before automation.

Wren should first be reliable at maintaining a simple Markdown boundary: source material stays readable, generated synthesis stays inspectable, and useful reflections remain traceable over time.
