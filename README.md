# Wren

Wren is a Markdown-first protocol for maintaining traceable reflections across a local collection of Markdown files, designed with Obsidian vaults in mind.

It helps agents work with an Obsidian vault without turning the agent into your memory store. Wren adds local workflows and CLI helpers for three tasks: capturing conversations, recalling relevant context, and reflecting source notes into a source-linked wiki.


## Install from Source

```bash
git clone https://github.com/migsalazar/wren.git
cd wren
npm install
npm run build
npm link             # install the wren CLI
pi install "$(pwd)"  # install the Pi /wren adapter
```

### Using with other agents

Agents that read `AGENTS.md` can use `/wren capture`, `/wren recall`, `/wren reflect`, and `/wren lint` without an adapter. Right now, Pi is the only adapter; adapters are ergonomic conveniences.

## Quickstart

From an Obsidian vault or another Markdown workspace:

```bash
cd /path/to/obsidian/vault
wren init
```

`wren init` creates local Wren files without overwriting existing files:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/capture.md
.wren/templates/wiki.md
AGENTS.md
wiki/index.md
wiki/log.md
```

Review `.wren/config.json`; Wren auto-detects top-level Markdown folders as `sources`, includes the capture path, skips wiki/hidden/system folders, and enables BM25 search. You can configure these paths and options, and should remove anything Wren should not use as evidence.

## Use Wren

From the vault or Markdown workspace, start your agent and use:

```text
/wren help
/wren capture [instructions]
/wren recall [query]
/wren reflect [scope]
/wren lint [scope]
```

With the Pi adapter installed, helper commands are also available:

```text
/wren init
/wren doctor
/wren index
/wren search <query>
```

Typical flows:

- Capture: discuss something with an agent, then invoke `/wren capture`; Wren writes a source note to the configured capture area and refreshes BM25 when enabled.
- Reflect: invoke `/wren reflect`; Wren applies minimal source-linked wiki/index/log updates and refreshes BM25 when enabled.

In git-backed vaults, configured-area writes happen directly. In non-git vaults, Wren asks before writing. Wren also asks before destructive, unusual, or out-of-boundary changes.

Wren does not automatically synthesize notes. Use `/wren reflect` to introduce configured source notes into Wren's wiki synthesis.

For local health and search:

```bash
wren index
wren doctor
wren lint
```

`wren doctor` may warn about a missing capture directory before the first capture, unlisted top-level Markdown folders, or a missing/stale BM25 index.

## Core Idea

Wren treats Markdown as durable memory. The LLM can search, summarize, synthesize, and maintain knowledge, but plain files remain the durable artifacts.

```text
configured source folders -> source evidence
wiki workspace            -> source-linked synthesis
.wren/                    -> protocol, config, and templates
```

Capture notes are ordinary source notes when the capture path is listed in `sources`. During recall and reflection, Wren reads configured `sources` plus files or folders the user explicitly provides. Writes stay constrained: `/wren capture` writes to the configured capture area, `/wren reflect` writes to configured wiki workspaces, and BM25 refreshes write only derived `.wren/cache/` files. Wren asks before writing only for non-git vaults or destructive, unusual, or out-of-boundary changes.

## Local Protocol Files

Wren behavior lives in vault-local files:

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

The generated `AGENTS.md` maps workflow requests to `.wren/workflows/*.md`. Templates are local and editable; the default capture template keeps the title as the first line for Obsidian compatibility.

## Wiki Index and Log

- `wiki/index.md` catalogs wiki pages with links and one-line summaries, grouped only when useful. Recall reads it first.
- `wiki/log.md` is append-only and chronological, with headings like `## [YYYY-MM-DD] reflect | Title`.

These are productive files, not instruction templates. Reflect should keep them concise, update `wiki/index.md` for meaningful wiki changes, and append a concise entry to `wiki/log.md`.

## Workflows

### `/wren capture`

Summarize the current agent discussion into a source-level capture note. Capture preserves summary, assumptions, disagreements or tensions, and Markdown tags. In git-backed vaults it writes directly to the configured capture area; in non-git vaults it asks first. When BM25 is enabled, capture refreshes the search index after writing.

### `/wren recall`

Recover relevant context and relate it to the current discussion. Recall reads the wiki index, relevant wiki pages, and configured source notes when evidence, detail, or freshness requires it. When BM25 is enabled, recall may use `wren search` as a retrieval gate.

### `/wren reflect`

Turn configured source notes into source-linked wiki synthesis. Generated wiki pages require `## Sources`; meaningful changes also update `wiki/index.md` and `wiki/log.md`. In git-backed vaults reflect applies minimal changes directly; in non-git vaults it asks first.

### `/wren lint`

Check Wren workspace health without silently rewriting notes. It currently reports:

- wiki pages without `## Sources`, except `index.md` and `log.md`,
- wiki pages missing from the wiki index,
- empty capture notes or wiki pages,
- broken relative Markdown links in configured capture/wiki areas,
- broken simple wikilinks by filename or title match.

## CLI Helpers

The CLI supports deterministic setup, search, diagnostics, and capture helpers:

```bash
wren init
wren index
wren search "query" --area all --limit 10
wren doctor
wren capture --title "Discussion title" --tag wren --stdin
wren lint
```

`wren index` builds `.wren/cache/search-index.json`; `wren search` returns ranked, line-numbered snippets. `wren capture --stdin` uses the local `.wren/templates/capture.md` template and refreshes the search index when BM25 is enabled.

## Development

From the Wren repository checkout:

```bash
npm install            # first-time dependency install
npm run check          # type-check
npm run build          # compile src/ to dist/
node dist/cli.js --help
npm test               # build and run tests
```

For a local vault smoke test:

```bash
REPO="$(pwd)"
VAULT="$(mktemp -d /tmp/wren-smoke-XXXXXX)"
mkdir -p "$VAULT/notes"
printf '# Smoke source\n\nThis note is evidence for a Wren smoke test.\n' > "$VAULT/notes/source.md"
cd "$VAULT"
node "$REPO/dist/cli.js" init
node "$REPO/dist/cli.js" index
node "$REPO/dist/cli.js" doctor
node "$REPO/dist/cli.js" lint
pi --mode json --print --no-session --offline --approve "/wren help"
cd "$REPO"
rm -rf "$VAULT"
```
