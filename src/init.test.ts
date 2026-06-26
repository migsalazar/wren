import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { formatInitResult, initWren } from './init.js';

const packageRoot = process.cwd();
const SCAFFOLD_FILES = [
  '.wren/config.json',
  '.wren/workflows/recap.md',
  '.wren/workflows/recall.md',
  '.wren/workflows/reflect.md',
  '.wren/templates/recap.md',
  '.wren/templates/atlas.md',
  'AGENTS.md',
  'atlas/index.md',
  'atlas/log.md'
];

test('initWren creates scaffold files without creating recap folder', async () => {
  const root = await tempDir();
  try {
    const result = await initWren(root, packageRoot);

    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.created.sort(), [...SCAFFOLD_FILES].sort());

    const config = JSON.parse(await readFile(path.join(root, '.wren/config.json'), 'utf8')) as {
      areas: { atlas: { path: string; defaultSection: string } };
      sources: Array<{ path: string; atlasSection?: string }>;
      useBm25: boolean;
    };

    assert.deepEqual(result.configuredSources, ['recap']);
    assert.equal(config.areas.atlas.path, 'atlas');
    assert.equal(config.areas.atlas.defaultSection, 'general');
    assert.deepEqual(config.sources, [{ path: 'recap', atlasSection: 'general' }]);
    assert.equal(config.useBm25, true);
    await assert.rejects(readFile(path.join(root, 'recap'), 'utf8'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren preserves preexisting scaffold files while creating missing scaffold files', async () => {
  const root = await tempDir();
  try {
    const preexistingFiles = ['AGENTS.md', '.wren/workflows/recap.md', 'atlas/index.md'];
    const sentinels = new Map<string, string>();

    for (const [index, scaffoldFile] of preexistingFiles.entries()) {
      const sentinel = `preexisting scaffold content ${index}: ${scaffoldFile}`;
      sentinels.set(scaffoldFile, sentinel);
      await mkdir(path.dirname(path.join(root, scaffoldFile)), { recursive: true });
      await writeFile(path.join(root, scaffoldFile), sentinel, 'utf8');
    }

    const result = await initWren(root, packageRoot);
    const expectedCreated = SCAFFOLD_FILES.filter((scaffoldFile) => !preexistingFiles.includes(scaffoldFile));

    assert.deepEqual(result.created.sort(), expectedCreated.sort());
    assert.deepEqual(result.skipped.sort(), [...preexistingFiles].sort());
    assert.deepEqual(result.configuredSources, ['recap']);

    for (const [scaffoldFile, sentinel] of sentinels) {
      assert.equal(await readFile(path.join(root, scaffoldFile), 'utf8'), sentinel);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren detects top-level Markdown source folders', async () => {
  const root = await tempDir();
  try {
    await mkdir(path.join(root, 'notes'), { recursive: true });
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await mkdir(path.join(root, 'atlas'), { recursive: true });
    await mkdir(path.join(root, '.obsidian'), { recursive: true });
    await mkdir(path.join(root, 'node_modules', 'package'), { recursive: true });
    await writeFile(path.join(root, 'notes', 'important.md'), '# Important\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'image.png'), 'not markdown', 'utf8');
    await writeFile(path.join(root, 'atlas', 'existing.md'), '# Existing atlas\n', 'utf8');
    await writeFile(path.join(root, '.obsidian', 'hidden.md'), '# Hidden\n', 'utf8');
    await writeFile(path.join(root, 'node_modules', 'package', 'README.md'), '# Dependency\n', 'utf8');

    const result = await initWren(root, packageRoot);
    const config = JSON.parse(await readFile(path.join(root, '.wren/config.json'), 'utf8')) as {
      sources: Array<{ path: string; atlasSection?: string }>;
      useBm25: boolean;
    };

    assert.deepEqual(result.configuredSources, ['recap', 'notes']);
    assert.deepEqual(config.sources, [
      { path: 'recap', atlasSection: 'general' },
      { path: 'notes', atlasSection: 'notes' }
    ]);
    assert.equal(config.useBm25, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren avoids reserved atlas section names for discovered source folders', async () => {
  const root = await tempDir();
  try {
    await mkdir(path.join(root, 'index.md'), { recursive: true });
    await mkdir(path.join(root, 'log.md'), { recursive: true });
    await writeFile(path.join(root, 'index.md', 'source.md'), '# Index source\n', 'utf8');
    await writeFile(path.join(root, 'log.md', 'source.md'), '# Log source\n', 'utf8');

    const result = await initWren(root, packageRoot);
    const config = await loadConfig(root);

    assert.deepEqual(result.configuredSources, ['recap', 'index.md', 'log.md']);
    assert.deepEqual(config.sources, [
      { path: 'recap', atlasSection: 'general' },
      { path: 'index.md', atlasSection: 'source-index' },
      { path: 'log.md', atlasSection: 'source-log' }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('initWren skips existing scaffold files without overwriting them', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    const sentinels = new Map<string, string>();

    for (const [index, scaffoldFile] of SCAFFOLD_FILES.entries()) {
      const sentinel = `custom scaffold content ${index}: ${scaffoldFile}`;
      sentinels.set(scaffoldFile, sentinel);
      await writeFile(path.join(root, scaffoldFile), sentinel, 'utf8');
    }

    const result = await initWren(root, packageRoot);

    assert.deepEqual(result.created, []);
    assert.deepEqual(result.skipped.sort(), [...SCAFFOLD_FILES].sort());
    assert.equal(result.configuredSources, undefined);

    for (const [scaffoldFile, sentinel] of sentinels) {
      assert.equal(await readFile(path.join(root, scaffoldFile), 'utf8'), sentinel);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('formatInitResult shows created, skipped, and configured source files', () => {
  const output = formatInitResult({
    created: ['.wren/config.json'],
    skipped: ['AGENTS.md'],
    configuredSources: ['recap', 'notes']
  });

  assert.match(output, /Created:/);
  assert.match(output, /\.wren\/config\.json/);
  assert.match(output, /Skipped existing files:/);
  assert.match(output, /AGENTS\.md/);
  assert.match(output, /Configured source folders:/);
  assert.match(output, /recap/);
  assert.match(output, /notes/);
  assert.match(output, /Review them in \.wren\/config\.json/);
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-init-test-'));
}
