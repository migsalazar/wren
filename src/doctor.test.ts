import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { formatDoctorReport, runDoctor } from './doctor.js';
import { initWren } from './init.js';
import { buildAndWriteSearchIndex } from './search.js';

const packageRoot = process.cwd();

test('runDoctor reports missing config as an error', async () => {
  const root = await tempDir();
  try {
    const report = await runDoctor(root);

    assert.equal(report.errors, 1);
    assert.equal(report.warnings, 0);
    assert.deepEqual(report.checks, [
      { status: 'error', message: 'config missing: .wren/config.json' }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor passes initialized vault with capture and search index warnings', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 2);
    assert.ok(report.checks.some((check) => check.message === 'config valid'));
    assert.ok(report.checks.some((check) => check.message === 'wiki index exists: wiki/index.md'));
    assert.ok(report.checks.some((check) => check.message === 'capture workflow exists: .wren/workflows/capture.md'));
    assert.ok(report.checks.some((check) => check.message === 'capture template exists: .wren/templates/capture.md'));
    assert.ok(report.checks.some((check) => check.message === 'wiki template exists: .wren/templates/wiki.md'));
    assert.ok(report.checks.some((check) => check.message === 'capture directory missing: capture'));
    assert.ok(report.checks.some((check) => check.message === 'BM25 recall enabled'));
    assert.ok(report.checks.some((check) => check.message === 'search index missing: .wren/cache/search-index.json'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor passes without warnings when capture and search index exist', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'capture'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 0);
    assert.ok(report.checks.some((check) => check.message.startsWith('search index fresh:')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns about Markdown folders missing from sources', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'capture'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));
    await mkdir(path.join(root, 'notes'));
    await writeFile(path.join(root, 'notes', 'important.md'), '# Important\n', 'utf8');

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(
      report.checks.some(
        (check) => check.message === 'source folder not configured: notes (review sources in .wren/config.json)'
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns when search index is stale', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'capture'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));
    await writeFile(path.join(root, 'capture', 'new.md'), '# New\n', 'utf8');

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(report.checks.some((check) => check.message === 'search index stale: new Markdown file: capture/new.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor reports missing wiki files as errors', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        capture: { path: 'capture' },
        wiki: { default: { path: 'wiki' } }
      },
      defaultWiki: 'default'
    });

    const report = await runDoctor(root);

    assert.ok(report.errors >= 3);
    assert.ok(report.checks.some((check) => check.message === 'wiki directory missing: wiki'));
    assert.ok(report.checks.some((check) => check.message === 'wiki index missing: wiki/index.md'));
    assert.ok(report.checks.some((check) => check.message === 'wiki log missing: wiki/log.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('formatDoctorReport renders status symbols and summary', () => {
  const output = formatDoctorReport({
    errors: 1,
    warnings: 1,
    checks: [
      { status: 'ok', message: 'config valid' },
      { status: 'warn', message: 'capture directory missing: capture' },
      { status: 'error', message: 'wiki missing: wiki' }
    ]
  });

  assert.match(output, /^Wren doctor/);
  assert.match(output, /✓ config valid/);
  assert.match(output, /! capture directory missing: capture/);
  assert.match(output, /✗ wiki missing: wiki/);
  assert.match(output, /Result: 1 warning, 1 error/);
});

async function writeConfig(root: string, value: unknown): Promise<void> {
  const configPath = path.join(root, '.wren', 'config.json');
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(value), 'utf8');
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-doctor-test-'));
}
