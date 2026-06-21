import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planWrenCommand, type WrenCliPlan, type WrenCommandPlan } from './command.js';

// Compile-time-only structural interfaces for the small Pi API surface this adapter uses.
// See docs/decisions/0001-pi-adapter-typing.md.
interface PiApi {
  registerCommand(name: string, options: PiCommandOptions): void;
  sendUserMessage(content: string, options?: { deliverAs?: 'steer' | 'followUp' }): void;
  sendMessage?(message: PiCustomMessage): void;
  exec(command: string, args: string[], options?: PiExecOptions): Promise<PiExecResult>;
}

interface PiCommandOptions {
  description: string;
  handler(args: string, ctx: PiCommandContext): Promise<void> | void;
}

interface PiCommandContext {
  cwd: string;
  signal?: AbortSignal;
  isIdle(): boolean;
  ui: {
    notify(message: string, level?: 'info' | 'warning' | 'error'): void;
    confirm(title: string, message: string): Promise<boolean>;
  };
}

interface PiCustomMessage {
  customType: string;
  content: string;
  display?: boolean;
}

interface PiExecOptions {
  cwd?: string;
  signal?: AbortSignal;
}

interface PiExecResult {
  stdout: string;
  stderr: string;
  code: number;
  killed?: boolean;
}

export default function registerWrenPiAdapter(pi: PiApi): void {
  pi.registerCommand('wren', {
    description: 'Use Wren workflows and CLI helpers',
    handler: async (args, ctx) => {
      const plan = planWrenCommand(args);
      await executeWrenPlan(pi, ctx, plan);
    }
  });
}

async function executeWrenPlan(pi: PiApi, ctx: PiCommandContext, plan: WrenCommandPlan): Promise<void> {
  if (plan.kind === 'help') {
    showMessage(pi, ctx, plan.message, 'info');
    return;
  }

  if (plan.kind === 'error') {
    showMessage(pi, ctx, plan.message, 'error');
    return;
  }

  if (plan.kind === 'workflow') {
    sendWorkflowPrompt(pi, ctx, plan.prompt);
    return;
  }

  await runCliPlan(pi, ctx, plan);
}

function sendWorkflowPrompt(pi: PiApi, ctx: PiCommandContext, prompt: string): void {
  if (ctx.isIdle()) {
    pi.sendUserMessage(prompt);
    return;
  }

  pi.sendUserMessage(prompt, { deliverAs: 'followUp' });
  ctx.ui.notify('Queued Wren workflow as a follow-up message.', 'info');
}

async function runCliPlan(pi: PiApi, ctx: PiCommandContext, plan: WrenCliPlan): Promise<void> {
  if (plan.confirm) {
    const approved = await ctx.ui.confirm(plan.confirm.title, plan.confirm.message);
    if (!approved) {
      ctx.ui.notify('Cancelled Wren command.', 'warning');
      return;
    }
  }

  const result = await pi.exec(process.execPath, [bundledCliPath(), ...plan.cliArgs], {
    cwd: ctx.cwd,
    signal: ctx.signal
  });
  const message = formatCliResult(plan, result);
  showMessage(pi, ctx, message, result.code === 0 ? 'info' : 'error');
}

function formatCliResult(plan: WrenCliPlan, result: PiExecResult): string {
  const lines = [`Wren CLI: ${plan.displayCommand}`, `Exit code: ${result.code}`];

  if (result.killed) lines.push('Process was killed before completion.');
  if (result.stdout.trim()) lines.push('', 'stdout:', result.stdout.trimEnd());
  if (result.stderr.trim()) lines.push('', 'stderr:', result.stderr.trimEnd());

  return lines.join('\n');
}

function showMessage(pi: PiApi, ctx: PiCommandContext, content: string, level: 'info' | 'warning' | 'error'): void {
  if (pi.sendMessage) {
    pi.sendMessage({ customType: 'wren-command', content, display: true });
    return;
  }

  ctx.ui.notify(content, level);
}

function bundledCliPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'cli.js');
}
