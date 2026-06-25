# Wren

Wren is a Markdown-first protocol for maintaining traceable notes across a local collection of Markdown files, designed with Obsidian vaults in mind.

It helps agents work with an Obsidian vault. Wren adds local workflows and deterministic helpers for capturing conversations, recalling relevant context, validating workspace health, and maintaining source-linked synthesis.

## Quick Start

Clone and install:

```bash
git clone https://github.com/migsalazar/wren.git
cd wren
npm install
npm run build
npm link             # install the wren CLI
```

Right now, Pi is the only adapter; adapters are ergonomic conveniences. The adapter sends workflow commands to the agent and runs deterministic CLI helpers directly:

```bash
pi install "$(pwd)"  # install the Pi /wren adapter from the Wren checkout
```

*With other agents*: Agents that read `AGENTS.md` can follow `/wren recap`, `/wren recall`, and `/wren reflect` as workflows.

## Initialize a Vault

From an Obsidian vault or Markdown workspace:

```bash
cd /path/to/vault
wren init
wren doctor
```

`wren init` creates local Wren files without overwriting existing files:

```text
.wren/config.json
.wren/workflows/*.md
.wren/templates/*.md
AGENTS.md
atlas/index.md
atlas/log.md
```

Review `.wren/config.json` after initialization. Wren auto-detects top-level Markdown source folders, includes the recap path, skips atlas/hidden/system folders, and enables BM25 search.

## Command Model

Wren has three command categories.

_Use `/wren help` in Pi to see available Wren commands._

### Agent workflows

Agent workflows guide reasoning, retrieval, synthesis, or writing. Use them through an agent:

```text
/wren recap [instructions]
/wren recall [query]
/wren reflect [scope]
```

- `/wren recap`: summarize the current agent conversation into a source-level recap note; store it with deterministic recap-writing mechanics and refresh BM25 when enabled.
- `/wren recall`: read the atlas index first, then relevant atlas pages and source evidence as needed; log path/query-only metrics locally.
- `/wren reflect`: update source-linked atlas synthesis under the selected atlas section plus the configured atlas root's `index.md` and `log.md`; log path-only metrics and refresh BM25 when enabled.

### User-facing CLI helpers

CLI helpers are deterministic and scriptable. Agents may use them, and you can run them directly from a vault:

```bash
wren init
wren doctor
wren index
wren search "query" --area all --limit 10
wren lint
```

- `wren init`: create Wren scaffold files without overwriting existing files.
- `wren doctor`: report setup, source, and search-index issues.
- `wren index`: build `.wren/cache/search-index.json`.
- `wren search`: return ranked, line-numbered snippets.
- `wren lint`: report structure/link/source issues.

### Workflow support commands

Workflow support commands are low-level primitives used by Wren workflows and adapters. They are not user-facing helpers.

Examples include `wren write-recap` and `wren metric`.

## Core Model

```text
configured source folders -> source evidence
atlas/                    -> source-linked synthesis
.wren/                    -> protocol, config, templates, cache
```

- Recap notes are ordinary source notes when the recap path is listed in `sources`.
- `sources[].atlasSection` maps a source folder to a section under `areas.atlas.path`.
- Multiple source folders can map to the same atlas section.
- Recall and reflect read configured `sources`, plus files or folders the user explicitly provides.
- `/wren recap` writes only recap notes and derived `.wren/cache/` files.
- `/wren recall` may append path/query-only metrics to `.wren/cache/metrics.jsonl`.
- `/wren reflect` writes only configured atlas files and derived `.wren/cache/` files.
- `wren lint` checks vault content and Wren protocol health.
- `wren doctor` checks setup, config, runtime, and search-index health.
- Wren edits `.wren/config.json`, workflows, or templates only when explicitly requested.
- Wren does not automatically synthesize notes; invoke `/wren reflect` when source notes should enter the atlas.

## Safety and Write Policy

Agent workflow writes happen directly in git-backed vaults. In non-git vaults, Wren asks before writing. Direct CLI commands execute as requested. Wren also asks before destructive, unusual, or out-of-boundary changes. Wren does not create or switch git branches.

## Configuration

Example `.wren/config.json`:

```json
{
  "version": 1,
  "areas": {
    "recap": { "path": "recap" },
    "atlas": {
      "path": "atlas",
      "defaultSection": "general"
    }
  },
  "sources": [
    { "path": "project-notes", "atlasSection": "projects" },
    { "path": "reading-notes", "atlasSection": "reference" },
    { "path": "recap", "atlasSection": "general" }
  ],
  "useBm25": true
}
```

`atlas/` is Wren's source-linked synthesis workspace. Source folders can route reflection output into configured atlas sections under `areas.atlas.path`, such as `atlas/<section>/`.

## Atlas Index, Log, and Sections

- `atlas/index.md`: global content catalog for atlas pages. Recall reads it first.
- `atlas/log.md`: append-only activity log with headings like `## [YYYY-MM-DD] reflect | Title`.
- `atlas/<section>/`: synthesis pages routed from mapped source folders.

Reflect routing uses these rules:

1. If the user explicitly specifies a target atlas section, use it.
2. Otherwise, map each source evidence file to the longest matching configured source path.
3. Treat a mapped source without `atlasSection` as mapped to `areas.atlas.defaultSection`.
4. If all mapped source paths resolve to the same section, use that section.
5. If evidence maps to multiple sections or the target is ambiguous, ask before writing.
6. If no mapping applies, use `areas.atlas.defaultSection`.

These are productive files, not instruction templates. Reflect keeps them concise and updates them with meaningful atlas changes.

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
