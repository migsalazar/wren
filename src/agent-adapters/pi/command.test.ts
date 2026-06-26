import test from 'node:test';
import assert from 'node:assert/strict';
import { planWrenCommand } from './command.js';

test('/wren with no args shows help', () => {
  const plan = planWrenCommand('');

  assert.equal(plan.kind, 'help');
  assert.match(plan.message, /Usage:/);
  assert.match(plan.message, /\/wren recall \[query\]/);
});

test('/wren help shows help', () => {
  const plan = planWrenCommand('help');

  assert.equal(plan.kind, 'help');
  assert.match(plan.message, /Wren agent adapter commands/);
  assert.match(plan.message, /Agent workflows:/);
  assert.match(plan.message, /Deterministic helper aliases:/);
  assert.match(plan.message, /\/wren \.\.\. = agent adapter slash namespace/);
  assert.match(plan.message, /wren \.\.\.  = CLI command surface/);
});

test('/wren unknown command returns a useful error', () => {
  const plan = planWrenCommand('remember this');

  assert.equal(plan.kind, 'error');
  assert.match(plan.message, /Unknown Wren command: remember/);
  assert.match(plan.message, /\/wren help/);
});

test('/wren does not expose workflow support CLI primitives as aliases', () => {
  const writeRecap = planWrenCommand('write-recap');
  const metric = planWrenCommand('metric');

  assert.equal(writeRecap.kind, 'error');
  assert.match(writeRecap.message, /Unknown Wren command: write-recap/);
  assert.equal(metric.kind, 'error');
  assert.match(metric.message, /Unknown Wren command: metric/);
});

test('/wren recall builds a recall workflow prompt', () => {
  const plan = planWrenCommand('recall Nietzsche memory');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'recall');
  assert.equal(plan.workflowPath, '.wren/workflows/recall.md');
  assert.match(plan.prompt, /The user invoked \/wren recall Nietzsche memory\./);
  assert.match(plan.prompt, /Read `\.wren\/workflows\/recall\.md`/);
  assert.match(plan.prompt, /Read `\.wren\/config\.json`/);
  assert.match(plan.prompt, /Nietzsche memory/);
});

test('/wren recap preserves recap instructions', () => {
  const plan = planWrenCommand('recap preserve the Wren command taxonomy decision');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'recap');
  assert.equal(plan.workflowPath, '.wren/workflows/recap.md');
  assert.match(plan.prompt, /\/wren recap preserve the Wren command taxonomy decision/);
  assert.match(plan.prompt, /User arguments for the workflow:/);
});

test('/wren reflect preserves scope', () => {
  const plan = planWrenCommand('reflect notes/philosophy.md');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'reflect');
  assert.equal(plan.workflowPath, '.wren/workflows/reflect.md');
  assert.match(plan.prompt, /notes\/philosophy\.md/);
});

test('/wren lint builds a CLI plan', () => {
  const plan = planWrenCommand('lint');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'lint');
  assert.deepEqual(plan.cliArgs, ['lint']);
  assert.equal(plan.displayCommand, 'wren lint');
});

test('/wren doctor builds a CLI plan', () => {
  const plan = planWrenCommand('doctor');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'doctor');
  assert.deepEqual(plan.cliArgs, ['doctor']);
  assert.equal(plan.displayCommand, 'wren doctor');
});

test('/wren index builds a CLI plan', () => {
  const plan = planWrenCommand('index');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'index');
  assert.deepEqual(plan.cliArgs, ['index']);
});

test('/wren search preserves multi-word query and options', () => {
  const plan = planWrenCommand('search "memory identity" --area sources --limit 5');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'search');
  assert.deepEqual(plan.cliArgs, ['search', 'memory identity', '--area', 'sources', '--limit', '5']);
  assert.equal(plan.displayCommand, "wren search 'memory identity' --area sources --limit 5");
});

test('/wren learn defaults to list', () => {
  const plan = planWrenCommand('learn');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'learn');
  assert.deepEqual(plan.cliArgs, ['learn', 'list']);
  assert.equal(plan.displayCommand, 'wren learn list');
});

test('/wren learn list builds a CLI plan', () => {
  const plan = planWrenCommand('learn list');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'learn');
  assert.deepEqual(plan.cliArgs, ['learn', 'list']);
  assert.equal(plan.displayCommand, 'wren learn list');
});

test('/wren learn show and drop preserve candidate ids', () => {
  const show = planWrenCommand('learn show ask-before-cross-section-reflect');
  const drop = planWrenCommand('learn drop "Bad Candidate"');

  assert.equal(show.kind, 'cli');
  assert.deepEqual(show.cliArgs, ['learn', 'show', 'ask-before-cross-section-reflect']);
  assert.equal(show.displayCommand, 'wren learn show ask-before-cross-section-reflect');

  assert.equal(drop.kind, 'cli');
  assert.deepEqual(drop.cliArgs, ['learn', 'drop', 'Bad Candidate']);
  assert.equal(drop.displayCommand, "wren learn drop 'Bad Candidate'");
});

test('/wren learn validates subcommand usage', () => {
  const unknown = planWrenCommand('learn promote candidate');
  const missingId = planWrenCommand('learn show');
  const extraListArg = planWrenCommand('learn list extra');

  assert.equal(unknown.kind, 'error');
  assert.match(unknown.message, /Usage: \/wren learn list\|show\|drop/);
  assert.equal(missingId.kind, 'error');
  assert.match(missingId.message, /Usage: \/wren learn show <id>/);
  assert.equal(extraListArg.kind, 'error');
  assert.match(extraListArg.message, /Usage: \/wren learn list/);
});

test('/wren search requires a query', () => {
  const plan = planWrenCommand('search');

  assert.equal(plan.kind, 'error');
  assert.match(plan.message, /Usage: \/wren search <query>/);
});

test('/wren init requires confirmation', () => {
  const plan = planWrenCommand('init');

  assert.equal(plan.kind, 'cli');
  assert.equal(plan.command, 'init');
  assert.deepEqual(plan.cliArgs, ['init']);
  assert.ok(plan.confirm);
  assert.match(plan.confirm.message, /creates the local Wren scaffold/);
});

test('/wren reports unterminated CLI quotes', () => {
  const plan = planWrenCommand('search "memory identity');

  assert.equal(plan.kind, 'error');
  assert.match(plan.message, /Unterminated quote/);
});
