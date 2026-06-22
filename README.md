# Wren

Wren is a Markdown-first protocol for maintaining traceable reflections across a local collection of Markdown files, designed with Obsidian vaults in mind.

It helps agents work with an Obsidian vault. Wren adds local workflows and CLI helpers for: capturing conversations, recalling relevant context, and reflecting source notes into a source-linked wiki.

## Install Wren

```bash
git clone https://github.com/migsalazar/wren.git
cd wren
npm install
npm run build
npm link             # install the wren CLI
```

### Using with Pi

Right now, Pi is the only adapter; adapters are ergonomic conveniences.

```bash
pi install "$(pwd)"  # install the Pi /wren adapter
```

### Using with other agents

Agents that read `AGENTS.md` can use `/wren capture`, `/wren recall`, `/wren reflect`, and `/wren lint` without an adapter.

## Initialize local workflow

From an Obsidian vault or Markdown workspace:

```bash
cd /path/to/vault
wren init
```

`wren init` creates local Wren files without overwriting existing files:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/*.md
AGENTS.md
wiki/index.md
wiki/log.md
```

Review `.wren/config.json`. Wren auto-detects top-level Markdown source folders, includes the capture path, skips wiki/hidden/system folders, and enables BM25 search.

## Agent Commands

From the vault, start your agent and use:

```text
/wren help
/wren capture [instructions]
/wren recall [query]
/wren reflect [scope]
/wren lint [scope]
```

With the Pi adapter installed:

```text
/wren init
/wren doctor
/wren index
/wren search <query>
```

Workflow summary:

- `/wren capture`: write a source-level conversation note to the configured capture area; refresh BM25 when enabled.
- `/wren recall`: read the wiki index first, then relevant wiki pages and source evidence as needed.
- `/wren reflect`: update source-linked wiki synthesis, `wiki/index.md`, and `wiki/log.md`; refresh BM25 when enabled.
- `/wren lint`: report Wren workspace health issues without silent rewrites.

Agent workflow writes happen directly in git-backed vaults. In non-git vaults, Wren asks before writing. Direct CLI commands execute as requested. Wren also asks before destructive, unusual, or out-of-boundary changes. Wren does not create or switch git branches.

## Core Model

```text
configured source folders -> source evidence
wiki workspace            -> source-linked synthesis
.wren/                    -> protocol, config, templates, cache
```

- Capture notes are ordinary source notes when the capture path is listed in `sources`.
- Recall and reflect read configured `sources`, plus files or folders the user explicitly provides.
- `/wren capture` writes only capture notes and derived `.wren/cache/` search-index files.
- `/wren reflect` writes only configured wiki workspaces and derived `.wren/cache/` search-index files.
- Wren edits `.wren/config.json`, workflows, or templates only when explicitly requested.
- Wren does not automatically synthesize notes; invoke `/wren reflect` when source notes should enter the wiki.

## Wiki Index and Log

- `wiki/index.md`: content catalog for wiki pages. Recall reads it first.
- `wiki/log.md`: append-only activity log with headings like `## [YYYY-MM-DD] reflect | Title`.

These are productive files, not instruction templates. Reflect keeps them concise and updates them with meaningful wiki changes.

## CLI Helpers

```bash
wren init
wren index
wren search "query" --area all --limit 10
wren doctor
wren capture --title "Discussion title" --tag wren --stdin
wren lint
```

- `wren index` builds `.wren/cache/search-index.json`.
- `wren search` returns ranked, line-numbered snippets.
- `wren capture --stdin` uses `.wren/templates/capture.md` and refreshes BM25 when enabled.
- `wren doctor` reports setup, source, and search-index issues.
- `wren lint` reports structure/link/source issues.

## Development

From the Wren repository checkout:

```bash
npm install            # first-time dependency install
npm run check          # type-check
npm run build          # compile src/ to dist/
node dist/cli.js --help
npm test               # build and run tests
```

Local smoke test:

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
