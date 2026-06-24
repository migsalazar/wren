# Wren Agent Instructions

## Project Boundaries

- This repo is Wren software/docs/tooling, not a Wren-managed vault.
- Do not create personal notes, personal knowledge pages, or vault content in this repo.
- User vault content belongs in the user's Obsidian vault, not here.
- Use `README.md` as the source of truth for Wren terminology and scope.

## Conversational Style

- Keep answers concise and technical.
- No emojis in commits, issues, PR comments, or code.
- Answer questions before edits or implementation commands.
- When responding to feedback, say whether you agree or disagree first.

## TypeScript Tooling

- Package manager: npm.
- Build/type check: `npm run check`.
- Build: `npm run build`.
- Tests: `npm test`.
- CLI code lives under `src/`; templates live under `templates/`.
- Run commands through npm scripts when practical.

## Verification

- After CLI, scaffold, workflow, template, search, doctor, or config changes, run `npm run check` and `npm test` when practical.
- For CLI behavior changes, also run a smoke test in a temporary vault under `/tmp`.
  - Create the smoke-test folder with `mktemp -d /tmp/wren-smoke-XXXXXX`.
  - Add a small Markdown source note.
  - Run the local built CLI with `node <repo>/dist/cli.js ...`.
  - Verify expected output.
  - Remove the smoke-test folder from `/tmp` after the test.

## Code Quality

- Prefer small, single-purpose functions.
- Read relevant files in full before broad changes, audits, or editing files not already inspected. Use search for locating code, not as a substitute for understanding files.
- No `any` unless absolutely necessary.
- Avoid trivial one-use helpers unless they improve readability, isolate behavior, or make tests clearer.
- Check installed dependency types before using external APIs; do not guess.
- Prefer top-level static imports. Avoid dynamic imports unless there is a clear runtime reason.
- Do not weaken or remove code just to silence type errors. Ask before dependency upgrades or lockfile changes.
- Avoid TypeScript constructs that require unusual emit semantics, such as `enum`, `namespace`, parameter properties, `import =`, or `export =`, unless there is a clear reason.
- Avoid deeply nested control flow; prefer early returns.
- Keep positional parameters to 5 or fewer; use option objects when needed.
- Keep files focused; consider splitting files over roughly 500 lines.
- Always ask before removing intentional functionality.

## Behavioral Rules

- Prefer explaining the approach before non-trivial or broad edits.
- Read relevant files before editing them.
- Prefer editing existing files over creating new files unless a new file is clearly needed.
- Keep README, templates, workflow behavior, CLI behavior, and scripts aligned.
- Be explicit when a change affects protocol versus implementation.
- Do not modify a user's Obsidian vault unless explicitly requested.
- Do not run destructive Git commands unless explicitly requested.
- Never commit secrets, credentials, or `.env` files.
- Do not run install commands or change dependencies unless explicitly approved.
- Treat dependency and lockfile changes as reviewed code.
- Never commit unless the user asks.
