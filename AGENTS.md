# Wren Agent Instructions

## Project Boundaries

- This repo is Wren software/docs/tooling, not a Wren-managed vault.
- Do not create personal notes, wiki pages, or vault content in this repo.
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

## Code Quality

- Prefer small, single-purpose functions.
- No `any` unless absolutely necessary.
- Avoid deeply nested control flow; prefer early returns.
- Keep positional parameters to 5 or fewer; use option objects when needed.
- Keep files focused; consider splitting files over roughly 500 lines.
- Always ask before removing intentional functionality.

## Behavioral Rules

- Before editing or writing files, describe the planned change and wait for approval.
- Always read relevant files before editing them.
- Prefer editing existing files over creating new files unless a new file is clearly needed.
- Keep README, templates, workflow behavior, CLI behavior, and scripts aligned.
- Be explicit when a change affects protocol versus implementation.
- Do not modify a user's Obsidian vault unless explicitly requested.
- Do not run destructive Git commands unless explicitly requested.
- Never commit secrets, credentials, or `.env` files.
- Do not run install commands or change dependencies unless explicitly approved.
- Treat dependency and lockfile changes as reviewed code.
- Never commit unless the user asks.
