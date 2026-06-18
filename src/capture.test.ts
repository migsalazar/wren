import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { capture } from './capture.js';
import { initWren } from './init.js';

const packageRoot = process.cwd();

test('capture requires Wren init first', async () => {
  const root = await tempDir();
  try {
    await assert.rejects(
      capture(root, {}),
      /No \.wren\/config\.json found\. Run: wren init/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('capture creates a templated capture note with optional title', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await capture(root, { title: 'Roadmap Discussion' });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^capture\/\d{4}-\d{2}-\d{2}-\d{4}-roadmap-discussion\.md$/);
    assert.match(content, /^# Roadmap Discussion\n\n---\ndate: \d{4}-\d{2}-\d{2}\n---/);
    assert.match(content, /^## Captured from: agent discussion/m);
    assert.match(content, /^## Summary/m);
    assert.match(content, /^## Assumptions/m);
    assert.match(content, /^## Disagreements \/ Tensions/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('capture uses default title when no title is provided', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await capture(root, {});
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^capture\/\d{4}-\d{2}-\d{2}-\d{4}-capture\.md$/);
    assert.match(content, /^# Capture/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('capture can include provided body and tags', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await capture(root, {
      title: 'Direction',
      body: '## Summary\n\nWe clarified capture.',
      tags: ['wren', '#agent workflow', 'wren']
    });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(content, /^## Summary\n\nWe clarified capture\./m);
    assert.match(content, /^#wren #agent-workflow$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('capture uses the vault-local editable capture template', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(
      path.join(root, '.wren', 'templates', 'capture.md'),
      '# {{title}}\n\nLocal template\n\n{{body}}\n\n{{tags}}\n',
      'utf8'
    );

    const createdPath = await capture(root, { title: 'Custom', body: 'Custom body', tags: ['local'] });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(content, /^Local template$/m);
    assert.match(content, /^Custom body$/m);
    assert.match(content, /^#local$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-capture-test-'));
}
