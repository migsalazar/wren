import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { recap } from './recap.js';
import { initWren } from './init.js';

const packageRoot = process.cwd();

test('recap creates a templated recap note with optional title', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await recap(root, { title: 'Roadmap Discussion' });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^recap\/\d{4}-\d{2}-\d{2}-\d{4}-roadmap-discussion\.md$/);
    assert.match(content, /^# Roadmap Discussion\n\n---\ndate: \d{4}-\d{2}-\d{2}\n---/);
    assert.match(content, /^## Recapped from: agent discussion/m);
    assert.match(content, /^## Summary/m);
    assert.match(content, /^## Assumptions/m);
    assert.match(content, /^## Disagreements \/ Tensions/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recap uses default title when no title is provided', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await recap(root, {});
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^recap\/\d{4}-\d{2}-\d{2}-\d{4}-recap\.md$/);
    assert.match(content, /^# Recap/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recap can include provided body and tags', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await recap(root, {
      title: 'Direction',
      body: '## Summary\n\nWe clarified recap.',
      tags: ['wren', '#agent workflow', 'wren']
    });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(content, /^## Summary\n\nWe clarified recap\./m);
    assert.match(content, /^#wren #agent-workflow$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recap uses the vault-local editable template', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(
      path.join(root, '.wren', 'templates', 'recap.md'),
      '# {{title}}\n\nLocal template\n\n{{body}}\n\n{{tags}}\n',
      'utf8'
    );

    const createdPath = await recap(root, { title: 'Custom', body: 'Custom body', tags: ['local'] });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(content, /^Local template$/m);
    assert.match(content, /^Custom body$/m);
    assert.match(content, /^#local$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recap refreshes the BM25 search index when enabled', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await recap(root, { title: 'Indexed Recap', body: 'Searchable recap body.' });
    const index = JSON.parse(await readFile(path.join(root, '.wren', 'cache', 'search-index.json'), 'utf8')) as {
      documents: Array<{ path: string }>;
    };

    assert.ok(index.documents.some((document) => document.path === createdPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren recap CLI creates a recap note', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['recap', '--title', 'CLI Recap', '--tag', 'wren']);

    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /^Created recap: recap\/\d{4}-\d{2}-\d{2}-\d{4}-cli-recap\.md\n$/);

    const match = /^Created recap: (.+)\n$/.exec(result.stdout);
    assert.ok(match);
    const createdPath = match[1];
    assert.ok(createdPath);

    const content = await readFile(path.join(root, createdPath), 'utf8');
    assert.match(content, /^# CLI Recap/m);
    assert.match(content, /^#wren$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCli(root: string, args: string[]): Promise<CliResult> {
  const child = spawn(process.execPath, [path.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: root });
  let stdout = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  return await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-recap-test-'));
}
