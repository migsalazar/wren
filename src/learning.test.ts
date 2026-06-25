import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {
  dropLearningCandidate,
  LEARNING_CANDIDATES_DIR,
  listLearningCandidates,
  readLearningCandidate
} from './learning.js';

const execFileAsync = promisify(execFile);

test('listLearningCandidates parses valid candidates', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'ask-before-cross-section-reflect', validCandidate('ask-before-cross-section-reflect'));

    const records = await listLearningCandidates(root);

    assert.equal(records.length, 1);
    assert.equal(records[0].issues.length, 0);
    assert.equal(records[0].candidate?.id, 'ask-before-cross-section-reflect');
    assert.equal(records[0].candidate?.status, 'candidate');
    assert.equal(records[0].candidate?.scope, 'vault');
    assert.deepEqual(records[0].candidate?.evidence, ['.wren/cache/metrics.jsonl']);
    assert.deepEqual(records[0].candidate?.suggestedTargets, ['.wren/workflows/reflect.md']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('listLearningCandidates reports invalid and unsafe candidates', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'unsafe-target', `---
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

    const [record] = await listLearningCandidates(root);

    assert.ok(record.issues.some((issue) => issue === 'suggested target is not a Wren instruction surface: atlas/index.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('listLearningCandidates uses filename id when frontmatter id mismatches', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'filename-id', validCandidate('frontmatter-id'));

    const [record] = await listLearningCandidates(root);

    assert.equal(record.id, 'filename-id');
    assert.ok(record.issues.some((issue) => issue === 'id must match filename: expected filename-id.'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('listLearningCandidates accepts CRLF frontmatter and confidence 1.0', async () => {
  const root = await tempDir();
  try {
    const content = validCandidate('windows-candidate').replace('confidence: 0.72', 'confidence: 1.0').replace(/\n/g, '\r\n');
    await writeCandidate(root, 'windows-candidate', content);

    const [record] = await listLearningCandidates(root);

    assert.equal(record.issues.length, 0);
    assert.equal(record.candidate?.confidence, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('readLearningCandidate and dropLearningCandidate support invalid filename stems listed by learn list', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'Bad Candidate', validCandidate('bad-candidate'));

    const [record] = await listLearningCandidates(root);
    assert.equal(record.id, 'Bad Candidate');
    assert.ok(record.issues.some((issue) => issue === 'id must match filename: expected Bad Candidate.'));

    const readRecord = await readLearningCandidate(root, 'Bad Candidate');
    assert.equal(readRecord.id, 'Bad Candidate');

    const droppedPath = await dropLearningCandidate(root, 'Bad Candidate');
    assert.equal(droppedPath, '.wren/cache/learning/candidates/Bad Candidate.md');
    assert.deepEqual(await listLearningCandidates(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('readLearningCandidate rejects path-like references', async () => {
  await assert.rejects(() => readLearningCandidate('/tmp', '../candidate'), /direct candidate filename stem/);
});

test('readLearningCandidate and dropLearningCandidate use candidate ids', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'recap-source-purity', validCandidate('recap-source-purity'));

    const record = await readLearningCandidate(root, 'recap-source-purity');
    assert.equal(record.id, 'recap-source-purity');

    const droppedPath = await dropLearningCandidate(root, 'recap-source-purity');
    assert.equal(droppedPath, '.wren/cache/learning/candidates/recap-source-purity.md');
    assert.deepEqual(await listLearningCandidates(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren learn list/show/drop review candidates', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'ask-before-cross-section-reflect', validCandidate('ask-before-cross-section-reflect'));

    const list = await runCli(root, ['learn', 'list']);
    assert.match(list.stdout, /ask-before-cross-section-reflect \[valid\]/);

    const show = await runCli(root, ['learn', 'show', 'ask-before-cross-section-reflect']);
    assert.match(show.stdout, /# Ask Before Cross Section Reflect/);
    assert.match(show.stdout, /suggested_targets:/);

    const drop = await runCli(root, ['learn', 'drop', 'ask-before-cross-section-reflect']);
    assert.match(drop.stdout, /Dropped learning candidate: \.wren\/cache\/learning\/candidates\/ask-before-cross-section-reflect\.md/);

    const afterDrop = await runCli(root, ['learn', 'list']);
    assert.match(afterDrop.stdout, /No pending learning candidates/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren learn show/drop supports invalid filename stems from list output', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, 'Bad Candidate', validCandidate('bad-candidate'));

    const list = await runCli(root, ['learn', 'list']);
    assert.match(list.stdout, /Bad Candidate \[invalid\]/);

    const show = await runCli(root, ['learn', 'show', 'Bad Candidate']);
    assert.match(show.stdout, /id must match filename: expected Bad Candidate/);

    const drop = await runCli(root, ['learn', 'drop', 'Bad Candidate']);
    assert.match(drop.stdout, /Dropped learning candidate: \.wren\/cache\/learning\/candidates\/Bad Candidate\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('wren learn show/drop supports listed filename stems that start with a dash', async () => {
  const root = await tempDir();
  try {
    await writeCandidate(root, '-bad', validCandidate('bad'));

    const list = await runCli(root, ['learn', 'list']);
    assert.match(list.stdout, /-bad \[invalid\]/);

    const show = await runCli(root, ['learn', 'show', '-bad']);
    assert.match(show.stdout, /id must match filename: expected -bad/);

    const drop = await runCli(root, ['learn', 'drop', '-bad']);
    assert.match(drop.stdout, /Dropped learning candidate: \.wren\/cache\/learning\/candidates\/-bad\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function validCandidate(id: string): string {
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

## Observed Pattern

Reflection evidence repeatedly crossed atlas sections.
`;
}

async function writeCandidate(root: string, id: string, content: string): Promise<void> {
  const candidatePath = path.join(root, LEARNING_CANDIDATES_DIR, `${id}.md`);
  await mkdir(path.dirname(candidatePath), { recursive: true });
  await writeFile(candidatePath, content, 'utf8');
}

async function runCli(root: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [path.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: root });
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-learning-test-'));
}
