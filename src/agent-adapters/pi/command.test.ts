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
  assert.match(plan.message, /Wren agent command/);
});

test('/wren unknown command returns a useful error', () => {
  const plan = planWrenCommand('remember this');

  assert.equal(plan.kind, 'error');
  assert.match(plan.message, /Unknown Wren command: remember/);
  assert.match(plan.message, /\/wren help/);
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

test('/wren capture preserves capture instructions', () => {
  const plan = planWrenCommand('capture --title "Wren UX" preserve the command decision');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'capture');
  assert.equal(plan.workflowPath, '.wren/workflows/capture.md');
  assert.match(plan.prompt, /\/wren capture --title "Wren UX" preserve the command decision/);
  assert.match(plan.prompt, /User arguments for the workflow:/);
});

test('/wren reflect preserves scope', () => {
  const plan = planWrenCommand('reflect notes/philosophy.md');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'reflect');
  assert.equal(plan.workflowPath, '.wren/workflows/reflect.md');
  assert.match(plan.prompt, /notes\/philosophy\.md/);
});

test('/wren lint is workflow-backed', () => {
  const plan = planWrenCommand('lint');

  assert.equal(plan.kind, 'workflow');
  assert.equal(plan.command, 'lint');
  assert.equal(plan.workflowPath, '.wren/workflows/lint.md');
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
