import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initWren } from './init.js';
import { formatLintReport, runLint } from './lint.js';

const packageRoot = process.cwd();

test('runLint passes initialized Wren scaffold', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const report = await runLint(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 0);
    assert.equal(report.filesChecked, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runLint reports wiki pages missing sources and index coverage', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(path.join(root, 'wiki', 'concept.md'), '# Concept\n\nA synthesized page.\n', 'utf8');

    const report = await runLint(root);

    assert.equal(report.errors, 1);
    assert.equal(report.warnings, 1);
    assert.ok(report.issues.some((issue) => issue.message === 'wiki page missing sources: wiki/concept.md'));
    assert.ok(report.issues.some((issue) => issue.message === 'wiki page not listed in index: wiki/concept.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runLint reports empty recap notes', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'recap'));
    await writeFile(path.join(root, 'recap', 'empty.md'), '', 'utf8');

    const report = await runLint(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(report.issues.some((issue) => issue.message === 'empty recap note: recap/empty.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runLint reports broken markdown links and wikilinks', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(path.join(root, 'wiki', 'index.md'), '# Wren Index\n\n- [[page]]\n- [[log]]\n', 'utf8');
    await writeFile(
      path.join(root, 'wiki', 'page.md'),
      '# Page\n\nSee [missing](missing.md) and [[Missing Page]].\n\n## Sources\n\n- [[log]]\n',
      'utf8'
    );

    const report = await runLint(root);

    assert.equal(report.errors, 2);
    assert.ok(report.issues.some((issue) => issue.message === 'broken markdown link in wiki/page.md: missing.md'));
    assert.ok(report.issues.some((issue) => issue.message === 'broken wikilink in wiki/page.md: [[Missing Page]]'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('formatLintReport renders issues and summary', () => {
  const output = formatLintReport({
    filesChecked: 3,
    warnings: 1,
    errors: 1,
    issues: [
      { status: 'warn', message: 'empty recap note: recap/a.md' },
      { status: 'error', message: 'wiki page missing sources: wiki/a.md' }
    ]
  });

  assert.match(output, /^Wren lint/);
  assert.match(output, /✓ checked 3 Markdown files/);
  assert.match(output, /! empty recap note: recap\/a\.md/);
  assert.match(output, /✗ wiki page missing sources: wiki\/a\.md/);
  assert.match(output, /Result: 1 warning, 1 error/);
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-lint-test-'));
}
