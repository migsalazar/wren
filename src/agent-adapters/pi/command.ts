export type WrenWorkflowCommand = 'capture' | 'recall' | 'reflect' | 'lint';
export type WrenCliCommand = 'init' | 'doctor' | 'index' | 'search';

export interface WrenHelpPlan {
  kind: 'help';
  message: string;
}

export interface WrenErrorPlan {
  kind: 'error';
  message: string;
}

export interface WrenWorkflowPlan {
  kind: 'workflow';
  command: WrenWorkflowCommand;
  workflowPath: string;
  prompt: string;
}

export interface WrenCliPlan {
  kind: 'cli';
  command: WrenCliCommand;
  cliArgs: string[];
  displayCommand: string;
  confirm?: {
    title: string;
    message: string;
  };
}

export type WrenCommandPlan = WrenHelpPlan | WrenErrorPlan | WrenWorkflowPlan | WrenCliPlan;

const WORKFLOW_PATHS: Record<WrenWorkflowCommand, string> = {
  capture: '.wren/workflows/capture.md',
  recall: '.wren/workflows/recall.md',
  reflect: '.wren/workflows/reflect.md',
  lint: '.wren/workflows/lint.md'
};

const WORKFLOW_COMMANDS = new Set<string>(Object.keys(WORKFLOW_PATHS));
const CLI_COMMANDS = new Set<string>(['init', 'doctor', 'index', 'search']);

export function planWrenCommand(args: string): WrenCommandPlan {
  const parsed = parseInvocation(args);

  if (!parsed.subcommand || parsed.subcommand === 'help' || parsed.subcommand === '--help' || parsed.subcommand === '-h') {
    return { kind: 'help', message: formatWrenHelp() };
  }

  if (WORKFLOW_COMMANDS.has(parsed.subcommand)) {
    const command = parsed.subcommand as WrenWorkflowCommand;
    return {
      kind: 'workflow',
      command,
      workflowPath: WORKFLOW_PATHS[command],
      prompt: buildWorkflowPrompt(command, parsed.rest)
    };
  }

  if (CLI_COMMANDS.has(parsed.subcommand)) {
    return buildCliPlan(parsed.subcommand as WrenCliCommand, parsed.rest);
  }

  return {
    kind: 'error',
    message: `Unknown Wren command: ${parsed.subcommand}\n\n${formatWrenHelp()}`
  };
}

export function formatWrenHelp(): string {
  return `Wren agent command

Usage:
  /wren help
  /wren capture [instructions]
  /wren recall [query]
  /wren reflect [scope]
  /wren lint [scope]
  /wren doctor
  /wren index
  /wren search <query> [--area wiki|sources|all] [--limit N]
  /wren init

Workflow commands:
  capture   Follow .wren/workflows/capture.md and write a capture note.
  recall    Follow .wren/workflows/recall.md and recover relevant context.
  reflect   Follow .wren/workflows/reflect.md and update wiki synthesis.
  lint      Follow .wren/workflows/lint.md and report health issues.

CLI helper commands:
  doctor    Run deterministic setup diagnostics.
  index     Build the local BM25 search index.
  search    Search the local BM25 index.
  init      Create the Wren scaffold after confirmation.

Wren layers:
  /wren ... = canonical in-agent entrypoint when this adapter is installed
  wren ...  = deterministic CLI helper
  .wren/workflows/*.md = local protocol source of truth`;
}

function buildWorkflowPrompt(command: WrenWorkflowCommand, argsText: string): string {
  const trimmedArgs = argsText.trim();
  const workflowPath = WORKFLOW_PATHS[command];
  const invocation = trimmedArgs ? `/wren ${command} ${trimmedArgs}` : `/wren ${command}`;
  const lines = [
    `The user invoked ${invocation}.`,
    '',
    'Use the local Wren workflow protocol for this request.',
    '',
    'Required steps:',
    '1. Read `.wren/config.json` before doing Wren work.',
    `2. Read \`${workflowPath}\`.`,
    '3. Follow that workflow file as the source of truth for behavior, evidence, source scope, and write policy.',
    '',
    'Important boundaries:',
    '- This adapter is only the front door; do not replace the workflow with hardcoded behavior from this prompt.',
    '- Modify files only when the workflow permits it, and follow the workflow approval policy for git-backed versus non-git workspaces.',
    '- If `.wren/config.json` or the workflow file is missing, explain that the Wren scaffold is incomplete and suggest running `wren init`.'
  ];

  if (trimmedArgs) {
    lines.push('', 'User arguments for the workflow:', '```text', trimmedArgs, '```');
  }

  return lines.join('\n');
}

function buildCliPlan(command: WrenCliCommand, argsText: string): WrenCommandPlan {
  const tokenized = tokenizeArgs(argsText);
  if (tokenized.kind === 'error') return tokenized;

  const args = tokenized.tokens;
  if (command === 'search' && args.length === 0) {
    return { kind: 'error', message: 'Usage: /wren search <query> [--area wiki|sources|all] [--limit N]' };
  }

  if (command !== 'search' && args.length > 0) {
    return { kind: 'error', message: `Usage: /wren ${command}` };
  }

  const cliArgs = [command, ...args];

  if (command === 'init') {
    return {
      kind: 'cli',
      command,
      cliArgs,
      displayCommand: formatDisplayCommand(cliArgs),
      confirm: {
        title: 'Run wren init?',
        message: '`wren init` creates the local Wren scaffold without overwriting existing files.'
      }
    };
  }

  return {
    kind: 'cli',
    command,
    cliArgs,
    displayCommand: formatDisplayCommand(cliArgs)
  };
}

function parseInvocation(args: string): { subcommand: string | undefined; rest: string } {
  const trimmed = args.trim();
  if (!trimmed) return { subcommand: undefined, rest: '' };

  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (!match) return { subcommand: undefined, rest: '' };

  return { subcommand: match[1]?.toLowerCase(), rest: match[2] ?? '' };
}

function tokenizeArgs(argsText: string): { kind: 'ok'; tokens: string[] } | WrenErrorPlan {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | undefined;
  let escaping = false;

  for (const char of argsText.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (quote === 'double' && char === '\\') {
      escaping = true;
      continue;
    }

    if (!quote && char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"' && quote !== 'single') {
      quote = quote === 'double' ? undefined : 'double';
      continue;
    }

    if (char === "'" && quote !== 'double') {
      quote = quote === 'single' ? undefined : 'single';
      continue;
    }

    if (!quote && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) current += '\\';
  if (quote) return { kind: 'error', message: 'Unterminated quote in /wren command arguments.' };
  if (current) tokens.push(current);

  return { kind: 'ok', tokens };
}

function formatDisplayCommand(cliArgs: string[]): string {
  return ['wren', ...cliArgs].map(shellQuoteIfNeeded).join(' ');
}

function shellQuoteIfNeeded(value: string): string {
  if (/^[A-Za-z0-9_./:=#-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}
