import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

    const config = JSON.parse(await readFile(path.join(root, '.wren/config.json'), 'utf8')) as {
      sources: Array<{ path: string }>;
      useBm25: boolean;
    };

    assert.deepEqual(result.configuredSources, ['capture']);
    assert.deepEqual(config.sources, [{ path: 'capture' }]);
    assert.equal(config.useBm25, true);
    await assert.rejects(readFile(path.join(root, 'capture'), 'utf8'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren detects top-level Markdown source folders', async () => {
  const root = await tempDir();
  try {
    await mkdir(path.join(root, 'notes'), { recursive: true });
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await mkdir(path.join(root, 'wiki'), { recursive: true });
    await mkdir(path.join(root, '.obsidian'), { recursive: true });
    await mkdir(path.join(root, 'node_modules', 'package'), { recursive: true });
    await writeFile(path.join(root, 'notes', 'important.md'), '# Important\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'image.png'), 'not markdown', 'utf8');
    await writeFile(path.join(root, 'wiki', 'existing.md'), '# Existing wiki\n', 'utf8');
    await writeFile(path.join(root, '.obsidian', 'hidden.md'), '# Hidden\n', 'utf8');
    await writeFile(path.join(root, 'node_modules', 'package', 'README.md'), '# Dependency\n', 'utf8');

    const result = await initWren(root, packageRoot);
    const config = JSON.parse(await readFile(path.join(root, '.wren/config.json'), 'utf8')) as {
      sources: Array<{ path: string }>;
      useBm25: boolean;
    };

    assert.deepEqual(result.configuredSources, ['capture', 'notes']);
    assert.deepEqual(config.sources, [{ path: 'capture' }, { path: 'notes' }]);
    assert.equal(config.useBm25, true);
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

test('formatInitResult shows created, skipped, and configured source files', () => {
  const output = formatInitResult({
    created: ['.wren/config.json'],
    skipped: ['AGENTS.md'],
    configuredSources: ['capture', 'notes']
  });

  assert.match(output, /Created:/);
  assert.match(output, /\.wren\/config\.json/);
  assert.match(output, /Skipped existing files:/);
  assert.match(output, /AGENTS\.md/);
  assert.match(output, /Configured source folders:/);
  assert.match(output, /capture/);
  assert.match(output, /notes/);
  assert.match(output, /Review them in \.wren\/config\.json/);
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-init-test-'));
}
