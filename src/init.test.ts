import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatInitResult, initWren } from './init.js';

const packageRoot = process.cwd();

test('initWren creates scaffold files without creating capture folder', async () => {
  const root = await tempDir();
  try {
    const result = await initWren(root, packageRoot);

    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.created.sort(), [
      '.wren/config.json',
      '.wren/workflows/capture.md',
      '.wren/workflows/lint.md',
      '.wren/workflows/recall.md',
      '.wren/workflows/reflect.md',
      '.wren/templates/capture.md',
      '.wren/templates/wiki.md',
      'AGENTS.md',
      'wiki/index.md',
      'wiki/log.md'
    ].sort());

    assert.match(await readFile(path.join(root, '.wren/config.json'), 'utf8'), /"areas"/);
    await assert.rejects(readFile(path.join(root, 'capture'), 'utf8'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren skips existing files without overwriting them', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(path.join(root, 'AGENTS.md'), 'custom instructions', 'utf8');

    const result = await initWren(root, packageRoot);

    assert.equal((await readFile(path.join(root, 'AGENTS.md'), 'utf8')), 'custom instructions');
    assert.ok(result.skipped.includes('AGENTS.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('formatInitResult shows created and skipped files', () => {
  const output = formatInitResult({ created: ['.wren/config.json'], skipped: ['AGENTS.md'] });

  assert.match(output, /Created:/);
  assert.match(output, /\.wren\/config\.json/);
  assert.match(output, /Skipped existing files:/);
  assert.match(output, /AGENTS\.md/);
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-init-test-'));
}
