import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CONFIG_PATH, loadConfig } from './config.js';
import {
  buildAndWriteSearchIndex,
  formatIndexReport,
  formatSearchReport,
  runSearch,
  SEARCH_INDEX_PATH
} from './search.js';

test('buildAndWriteSearchIndex indexes configured wiki and source markdown', async () => {
  const root = await fixtureVault();
  try {
    const report = await buildAndWriteSearchIndex(root, await loadConfig(root));

    assert.equal(report.documentCount, 5);
    assert.equal(report.wikiCount, 2);
    assert.equal(report.sourceCount, 3);
    assert.deepEqual(report.warnings, []);
    assert.match(await readFile(path.join(root, SEARCH_INDEX_PATH), 'utf8'), /notes\/sky\.md/);
    assert.equal(await readFile(path.join(root, '.wren/cache/.gitignore'), 'utf8'), '*\n!.gitignore\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSearch ranks source documents with BM25 and field boosts', async () => {
  const root = await fixtureVault();
  try {
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const report = await runSearch(root, { query: 'important sky blue', area: 'sources', limit: 3 });

    assert.equal(report.area, 'sources');
    assert.equal(report.searchedFiles, 3);
    assert.equal(report.results[0].path, 'notes/sky.md');
    assert.ok(report.results[0].matched.includes('bm25'));
    assert.ok(report.results[0].snippet?.text.includes('The sky is blue'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSearch filters wiki and sources areas', async () => {
  const root = await fixtureVault();
  try {
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const wikiReport = await runSearch(root, { query: 'sky', area: 'wiki', limit: 5 });
    const sourceReport = await runSearch(root, { query: 'sky', area: 'sources', limit: 5 });

    assert.ok(wikiReport.results.length > 0);
    assert.ok(wikiReport.results.every((result) => result.area === 'wiki'));
    assert.ok(sourceReport.results.length > 0);
    assert.ok(sourceReport.results.every((result) => result.area === 'source'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSearch supports direct tag matches and shared-tag related matches', async () => {
  const root = await fixtureVault();
  try {
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const tagReport = await runSearch(root, { query: '#themostimportantnote', area: 'sources', limit: 3 });
    assert.equal(tagReport.results[0].path, 'notes/sky.md');
    assert.ok(tagReport.results[0].matched.includes('tag #themostimportantnote'));

    const relatedReport = await runSearch(root, { query: 'blue sky', area: 'sources', limit: 3 });
    const related = relatedReport.results.find((result) => result.path === 'notes/related.md');
    assert.ok(related);
    assert.ok(related.matched.includes('shared tag #weather'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runSearch requires an existing search index', async () => {
  const root = await fixtureVault();
  try {
    await assert.rejects(runSearch(root, { query: 'sky' }), /Search index missing\. Run: wren index/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('formatIndexReport and formatSearchReport render agent-readable output', async () => {
  const root = await fixtureVault();
  try {
    const indexReport = await buildAndWriteSearchIndex(root, await loadConfig(root));
    const searchReport = await runSearch(root, { query: 'sky', area: 'all', limit: 1 });

    assert.match(formatIndexReport(indexReport), /✓ indexed 5 Markdown files/);
    assert.match(formatSearchReport(searchReport), /^Wren search/);
    assert.match(formatSearchReport(searchReport), /Query: sky/);
    assert.match(formatSearchReport(searchReport), /matched:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixtureVault(): Promise<string> {
  const root = await tempDir();
  await writeConfig(root, {
    version: 1,
    areas: {
      capture: { path: 'capture' },
      wiki: { default: { path: 'wiki' } }
    },
    sources: [{ path: 'notes' }, { path: 'capture' }],
    useBm25: true,
    defaultWiki: 'default'
  });

  await mkdir(path.join(root, 'wiki'), { recursive: true });
  await mkdir(path.join(root, 'notes'), { recursive: true });
  await mkdir(path.join(root, 'capture'), { recursive: true });

  await writeFile(path.join(root, 'wiki', 'index.md'), '# Wren Index\n\n- [[sky]] — summary about sky notes.\n', 'utf8');
  await writeFile(
    path.join(root, 'wiki', 'sky.md'),
    '# Sky Synthesis\n\nThe sky synthesis cites source notes.\n\n## Sources\n\n- [[sky]]\n',
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'sky.md'),
    '# Important Sky Note\n\nThe sky is blue.\n\n#themostimportantnote #weather\n',
    'utf8'
  );
  await writeFile(path.join(root, 'notes', 'related.md'), '# Related Weather\n\nCloud notes.\n\n#weather\n', 'utf8');
  await writeFile(path.join(root, 'capture', 'meeting.md'), '# Meeting\n\nWe discussed unrelated planning.\n', 'utf8');

  return root;
}

async function writeConfig(root: string, value: unknown): Promise<void> {
  const configPath = path.join(root, CONFIG_PATH);
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(value), 'utf8');
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-search-test-'));
}
