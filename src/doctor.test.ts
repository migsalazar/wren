import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { formatDoctorReport, runDoctor } from './doctor.js';
import { LEARNING_CANDIDATES_DIR } from './learning.js';
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

test('runDoctor passes initialized vault with recap and search index warnings', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 2);
    assert.ok(report.checks.some((check) => check.message === 'config valid'));
    assert.ok(report.checks.some((check) => check.message === 'atlas configured: atlas'));
    assert.ok(report.checks.some((check) => check.message === 'atlas default section configured: general'));
    assert.ok(report.checks.some((check) => check.message === 'atlas index exists: atlas/index.md'));
    assert.ok(report.checks.some((check) => check.message === 'recap workflow exists: .wren/workflows/recap.md'));
    assert.ok(report.checks.some((check) => check.message === 'recap template exists: .wren/templates/recap.md'));
    assert.ok(report.checks.some((check) => check.message === 'atlas template exists: .wren/templates/atlas.md'));
    assert.ok(report.checks.some((check) => check.message === 'recap directory missing: recap'));
    assert.ok(report.checks.some((check) => check.message === 'source configured: recap -> atlas/general'));
    assert.ok(report.checks.some((check) => check.message === 'BM25 recall enabled'));
    assert.ok(report.checks.some((check) => check.message === 'search index missing: .wren/cache/search-index.json'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor renders source mappings with the configured atlas root', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'knowledge', defaultSection: 'general' }
      },
      sources: [
        { path: 'recap' },
        { path: 'notes', atlasSection: 'work' }
      ],
      useBm25: false
    });

    const report = await runDoctor(root);

    assert.ok(report.checks.some((check) => check.message === 'source configured: recap -> knowledge/general'));
    assert.ok(report.checks.some((check) => check.message === 'source configured: notes -> knowledge/work'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor passes without warnings when recap directory and search index exist', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'recap'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 0);
    assert.ok(report.checks.some((check) => check.message.startsWith('search index fresh:')));
    assert.ok(report.checks.some((check) => check.message === 'learning candidates: none (.wren/cache/learning/candidates)'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns about Markdown folders missing from sources', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'recap'));
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
    await mkdir(path.join(root, 'recap'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));
    await writeFile(path.join(root, 'recap', 'new.md'), '# New\n', 'utf8');

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(report.checks.some((check) => check.message === 'search index stale: new Markdown file: recap/new.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor reports valid pending learning candidates as ok', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'recap'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));
    await writeLearningCandidate(root, 'ask-before-cross-section-reflect', validLearningCandidate('ask-before-cross-section-reflect'));

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 0);
    assert.ok(report.checks.some((check) => check.message === 'learning candidates pending: 1 (review with: wren learn list)'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns when learning candidates are not protected by cache gitignore', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      useBm25: false
    });
    await mkdir(path.join(root, 'recap'));
    await writeLearningCandidate(root, 'ask-before-cross-section-reflect', validLearningCandidate('ask-before-cross-section-reflect'));

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(
      report.checks.some(
        (check) => check.message === 'learning candidate cache is not ignored: .wren/cache/.gitignore missing'
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns when learning candidate cache gitignore content is unexpected', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      useBm25: false
    });
    await mkdir(path.join(root, 'recap'));
    await writeLearningCandidate(root, 'ask-before-cross-section-reflect', validLearningCandidate('ask-before-cross-section-reflect'));
    await writeFile(path.join(root, '.wren', 'cache', '.gitignore'), 'unexpected\n', 'utf8');

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(
      report.checks.some(
        (check) => check.message === 'learning candidate cache is not ignored: .wren/cache/.gitignore has unexpected content'
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor warns about invalid learning candidates', async () => {
  const root = await tempDir();
  try {
    await initWren(root, packageRoot);
    await mkdir(path.join(root, 'recap'));
    await buildAndWriteSearchIndex(root, await loadConfig(root));
    await writeLearningCandidate(root, 'unsafe-target', `---
id: unsafe-target
status: candidate
scope: vault
domain: reflect-routing
confidence: 0.7
created: 2026-06-25
trigger: when reflecting
evidence:
  - recap/example.md
suggested_targets:
  - atlas/index.md
---

# Unsafe Target
`);

    const report = await runDoctor(root);

    assert.equal(report.errors, 0);
    assert.equal(report.warnings, 1);
    assert.ok(
      report.checks.some((check) =>
        check.message === 'learning candidate invalid: .wren/cache/learning/candidates/unsafe-target.md (suggested target is not a Wren instruction surface: atlas/index.md)'
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runDoctor reports missing atlas files as errors', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    const report = await runDoctor(root);

    assert.ok(report.errors >= 3);
    assert.ok(report.checks.some((check) => check.message === 'atlas directory missing: atlas'));
    assert.ok(report.checks.some((check) => check.message === 'atlas index missing: atlas/index.md'));
    assert.ok(report.checks.some((check) => check.message === 'atlas log missing: atlas/log.md'));
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
      { status: 'warn', message: 'recap directory missing: recap' },
      { status: 'error', message: 'atlas missing: atlas' }
    ]
  }, { color: false });

  assert.match(output, /^Wren doctor/);
  assert.match(output, /✓ config valid/);
  assert.match(output, /! recap directory missing: recap/);
  assert.match(output, /✗ atlas missing: atlas/);
  assert.match(output, /Result: 1 warning, 1 error/);
});

test('formatDoctorReport colors warnings yellow and errors red', () => {
  const output = formatDoctorReport({
    errors: 1,
    warnings: 1,
    checks: [
      { status: 'ok', message: 'config valid' },
      { status: 'warn', message: 'recap directory missing: recap' },
      { status: 'error', message: 'atlas missing: atlas' }
    ]
  }, { color: true });

  assert.match(output, /✓ config valid/);
  assert.match(output, /\u001b\[33m! recap directory missing: recap\u001b\[0m/);
  assert.match(output, /\u001b\[31m✗ atlas missing: atlas\u001b\[0m/);
});

async function writeConfig(root: string, value: unknown): Promise<void> {
  const configPath = path.join(root, '.wren', 'config.json');
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(value), 'utf8');
}

async function writeLearningCandidate(root: string, id: string, content: string): Promise<void> {
  const candidatePath = path.join(root, LEARNING_CANDIDATES_DIR, `${id}.md`);
  await mkdir(path.dirname(candidatePath), { recursive: true });
  await writeFile(candidatePath, content, 'utf8');
}

function validLearningCandidate(id: string): string {
  return `---
id: ${id}
status: candidate
scope: vault
domain: reflect-routing
confidence: 0.72
created: 2026-06-25
trigger: when reflect evidence maps to multiple atlas sections
evidence:
  - .wren/cache/metrics.jsonl
suggested_targets:
  - .wren/workflows/reflect.md
---

# Ask Before Cross Section Reflect
`;
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-doctor-test-'));
}
