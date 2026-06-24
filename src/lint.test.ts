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

test('runLint reports sectioned atlas pages missing sources and index coverage', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'atlas', 'work'), { recursive: true });
    await writeFile(path.join(root, 'atlas', 'work', 'concept.md'), '# Concept\n\nA synthesized page.\n', 'utf8');

    const report = await runLint(root);

    assert.equal(report.errors, 1);
    assert.equal(report.warnings, 1);
    assert.ok(report.issues.some((issue) => issue.message === 'atlas page missing sources: atlas/work/concept.md'));
    assert.ok(report.issues.some((issue) => issue.message === 'atlas page not listed in index: atlas/work/concept.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runLint resolves atlas source citations against configured source notes', async () => {
  const root = await tempDir();
  try {
    await mkdir(path.join(root, 'notes'), { recursive: true });
    await writeFile(path.join(root, 'notes', 'sky.md'), '# Sky Evidence\n\nThe sky source note.\n', 'utf8');
    await initWren(root, packageRoot);
    await writeFile(path.join(root, 'atlas', 'index.md'), '# Wren Atlas\n\n- [[page]] — cited source synthesis.\n', 'utf8');
    await writeFile(
      path.join(root, 'atlas', 'page.md'),
      '# Page\n\nA synthesized page.\n\n## Sources\n\n- [[sky]]\n- [[Sky Evidence]]\n',
      'utf8'
    );

    const report = await runLint(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 0);
    assert.equal(report.filesChecked, 3);
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

test('runLint reports broken markdown links and internal links', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(path.join(root, 'atlas', 'index.md'), '# Wren Atlas\n\n- [[page]]\n- [[log]]\n', 'utf8');
    await writeFile(
      path.join(root, 'atlas', 'page.md'),
      '# Page\n\nSee [missing](missing.md) and [[Missing Page]].\n\n## Sources\n\n- [[log]]\n',
      'utf8'
    );

    const report = await runLint(root);

    assert.equal(report.errors, 2);
    assert.ok(report.issues.some((issue) => issue.message === 'broken markdown link in atlas/page.md: missing.md'));
    assert.ok(report.issues.some((issue) => issue.message === 'broken internal link in atlas/page.md: [[Missing Page]]'));
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
      { status: 'error', message: 'atlas page missing sources: atlas/a.md' }
    ]
  });

  assert.match(output, /^Wren lint/);
  assert.match(output, /✓ checked 3 Markdown files/);
  assert.match(output, /! empty recap note: recap\/a\.md/);
  assert.match(output, /✗ atlas page missing sources: atlas\/a\.md/);
  assert.match(output, /Result: 1 warning, 1 error/);
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-lint-test-'));
}
