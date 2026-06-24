import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeRecap } from './recap.js';
import { initWren } from './init.js';

const packageRoot = process.cwd();

test('writeRecap creates a templated recap note with optional title', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await writeRecap(root, {
      title: 'Roadmap Discussion',
      body: '## Summary\n\nWe discussed the roadmap.'
    });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^recap\/\d{4}-\d{2}-\d{2}-\d{4}-roadmap-discussion\.md$/);
    assert.match(content, /^# Roadmap Discussion\n\n---\ndate: \d{4}-\d{2}-\d{2}\n---/);
    assert.match(content, /^## Recapped from: agent discussion/m);
    assert.match(content, /^## Summary\n\nWe discussed the roadmap\./m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeRecap uses default title when no title is provided', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await writeRecap(root, { body: '## Summary\n\nDefault title recap.' });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(createdPath, /^recap\/\d{4}-\d{2}-\d{2}-\d{4}-recap\.md$/);
    assert.match(content, /^# Recap/m);
    assert.match(content, /^## Summary\n\nDefault title recap\./m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeRecap rejects empty body content', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    await assert.rejects(writeRecap(root, { body: '  \n\t' }), /writeRecap requires non-empty body content/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeRecap can include provided body and tags', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await writeRecap(root, {
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

test('writeRecap uses the vault-local editable template', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeFile(
      path.join(root, '.wren', 'templates', 'recap.md'),
      '# {{title}}\n\nLocal template\n\n{{body}}\n\n{{tags}}\n',
      'utf8'
    );

    const createdPath = await writeRecap(root, { title: 'Custom', body: 'Custom body', tags: ['local'] });
    const content = await readFile(path.join(root, createdPath), 'utf8');

    assert.match(content, /^Local template$/m);
    assert.match(content, /^Custom body$/m);
    assert.match(content, /^#local$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeRecap refreshes the BM25 search index when enabled', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const createdPath = await writeRecap(root, { title: 'Indexed Recap', body: 'Searchable recap body.' });
    const index = JSON.parse(await readFile(path.join(root, '.wren', 'cache', 'search-index.json'), 'utf8')) as {
      documents: Array<{ path: string }>;
    };

    assert.ok(index.documents.some((document) => document.path === createdPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren write-recap CLI creates a recap note', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['write-recap', '--title', 'CLI Recap', '--tag', 'wren', '--stdin'], {
      stdin: '## Summary\n\nStored from authored content.'
    });

    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /^Created recap: recap\/\d{4}-\d{2}-\d{2}-\d{4}-cli-recap\.md\n$/);

    const match = /^Created recap: (.+)\n$/.exec(result.stdout);
    assert.ok(match);
    const createdPath = match[1];
    assert.ok(createdPath);

    const content = await readFile(path.join(root, createdPath), 'utf8');
    assert.match(content, /^# CLI Recap/m);
    assert.match(content, /^## Summary\n\nStored from authored content\./m);
    assert.match(content, /^#wren$/m);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren recap CLI command is removed', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['recap', '--stdin'], { stdin: '## Summary\n\nBody.' });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unknown command: recap/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren CLI help categorizes recap storage as workflow support', async () => {
  const root = await tempDir();
  try {
    const result = await runCli(root, ['--help']);

    assert.equal(result.code, 0);
    assert.doesNotMatch(result.stdout, /\n  recap\s+Create/);
    assert.match(result.stdout, /Workflow support commands:\n  write-recap\s+Store already-authored recap content from stdin\n  metric\s+Append a local workflow metric event/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren write-recap CLI requires stdin', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['write-recap', '--title', 'CLI Recap']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /write-recap requires --stdin/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren write-recap CLI rejects unexpected positional arguments', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['write-recap', 'notes.md', '--stdin'], { stdin: '## Summary\n\nBody.' });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unexpected write-recap argument: notes\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren write-recap CLI rejects empty stdin', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['write-recap', '--stdin'], { stdin: '  \n\t' });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /write-recap requires non-empty stdin content/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren write-recap CLI rejects unsupported flags', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const result = await runCli(root, ['write-recap', '--foo', '--stdin'], { stdin: '## Summary\n\nBody.' });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unsupported write-recap option: --foo/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCli(root: string, args: string[], options: { stdin?: string } = {}): Promise<CliResult> {
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

  if (options.stdin !== undefined) child.stdin.end(options.stdin);

  return await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-recap-test-'));
}
