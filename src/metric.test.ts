import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WREN_CACHE_GITIGNORE_CONTENT, WREN_CACHE_GITIGNORE_PATH } from './cache.js';
import { appendMetric, METRICS_PATH, resolveMetricInput } from './metric.js';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test('appendMetric appends JSONL events', async () => {
  const root = await tempDir();
  try {
    await appendMetric(root, {
      event: 'recall',
      query: 'basil watering',
      filesRead: ['wiki/basil.md', 'notes/basil-irrigation.md'],
      area: 'sources'
    });
    await appendMetric(root, { event: 'reflect', filesWritten: ['wiki/basil.md'] });

    const lines = await readMetricLines(root);

    assert.equal(lines.length, 2);
    const first = lines[0];
    const second = lines[1];
    assert.ok(first);
    assert.ok(second);
    assertIsoTimestamp(first.ts);
    assert.equal(first.event, 'recall');
    assert.equal(first.query, 'basil watering');
    assert.deepEqual(first.filesRead, ['wiki/basil.md', 'notes/basil-irrigation.md']);
    assert.equal(first.area, 'sources');
    assertIsoTimestamp(second.ts);
    assert.equal(second.event, 'reflect');
    assert.deepEqual(second.filesWritten, ['wiki/basil.md']);
    assert.equal('query' in second, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('appendMetric stamps ts and ignores caller-supplied ts', async () => {
  const root = await tempDir();
  try {
    const metric = resolveMetricInput({
      stdin: JSON.stringify({ ts: '2000-01-01T00:00:00.000Z', event: 'recall', query: 'basil watering' })
    });

    await appendMetric(root, metric);

    const [line] = await readMetricLines(root);
    assert.ok(line);
    assertIsoTimestamp(line.ts);
    assert.notEqual(line.ts, '2000-01-01T00:00:00.000Z');
    assert.equal(line.event, 'recall');
    assert.equal(line.query, 'basil watering');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveMetricInput collects repeated read values', () => {
  const metric = resolveMetricInput({
    event: 'recall',
    filesRead: ['wiki/basil.md', 'notes/basil-irrigation.md']
  });

  assert.deepEqual(metric.filesRead, ['wiki/basil.md', 'notes/basil-irrigation.md']);
});

test('resolveMetricInput rejects unknown events', () => {
  assert.throws(() => resolveMetricInput({ event: 'publish' }), /--event must be one of: recall, reflect, recap, search\./);
});

test('wren metric CLI collects repeated read flags', async () => {
  const root = await tempDir();
  try {
    const result = await runCli(root, [
      'metric',
      '--event',
      'recall',
      '--read',
      'wiki/basil.md',
      '--read',
      'notes/basil-irrigation.md'
    ]);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Logged metric: \.wren\/cache\/metrics\.jsonl/);
    const [line] = await readMetricLines(root);
    assert.ok(line);
    assert.deepEqual(line.filesRead, ['wiki/basil.md', 'notes/basil-irrigation.md']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren metric CLI rejects unexpected positional paths', async () => {
  const root = await tempDir();
  try {
    const result = await runCli(root, [
      'metric',
      '--event',
      'recall',
      '--read',
      'wiki/basil.md',
      'notes/basil-irrigation.md'
    ]);

    assert.equal(result.code, 1);
    assert.match(
      result.stderr,
      /Unexpected metric argument: notes\/basil-irrigation\.md\. Repeat --read or --write for multiple paths\./
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('appendMetric ensures the Wren cache gitignore exists', async () => {
  const root = await tempDir();
  try {
    await appendMetric(root, { event: 'recap' });

    assert.equal(await readFile(path.join(root, WREN_CACHE_GITIGNORE_PATH), 'utf8'), WREN_CACHE_GITIGNORE_CONTENT);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function readMetricLines(root: string): Promise<Array<Record<string, unknown>>> {
  const content = await readFile(path.join(root, METRICS_PATH), 'utf8');
  return content.trimEnd().split('\n').map(parseMetricLine);
}

function parseMetricLine(line: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(line);
  assertRecord(parsed);
  return parsed;
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  assert.ok(isRecord(value));
}

function assertIsoTimestamp(value: unknown): void {
  if (typeof value !== 'string') assert.fail('expected ISO timestamp string');
  assert.match(value, ISO_TIMESTAMP);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  return mkdtemp(path.join(os.tmpdir(), 'wren-metric-test-'));
}
