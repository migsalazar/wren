import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CONFIG_PATH, loadConfig } from './config.js';
import { initWren } from './init.js';
import {
  buildAndWriteSearchIndex,
  formatIndexReport,
  formatSearchReport,
  runSearch,
  SEARCH_INDEX_PATH
} from './search.js';

test('buildAndWriteSearchIndex indexes configured atlas and source markdown', async () => {
  const root = await fixtureVault();
  try {
    const report = await buildAndWriteSearchIndex(root, await loadConfig(root));

    assert.equal(report.documentCount, 6);
    assert.equal(report.atlasCount, 3);
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

test('runSearch filters atlas and sources areas', async () => {
  const root = await fixtureVault();
  try {
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const atlasReport = await runSearch(root, { query: 'sky', area: 'atlas', limit: 5 });
    const sourceReport = await runSearch(root, { query: 'sky', area: 'sources', limit: 5 });

    assert.ok(atlasReport.results.length > 0);
    assert.ok(atlasReport.results.every((result) => result.area === 'atlas'));
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

test('runSearch preserves golden BM25 ranking cases', async () => {
  const root = await goldenSearchFixtureVault();
  try {
    await initWren(root, process.cwd());
    await buildAndWriteSearchIndex(root, await loadConfig(root));

    const cases: Array<{ query: string; expectedPaths: string[]; bm25Only?: boolean }> = [
      { query: 'fermentation', expectedPaths: ['notes/fermentation-guide.md', 'notes/winter-meal-plan.md'] },
      { query: 'basil irrigation', expectedPaths: ['notes/basil-irrigation.md'] },
      { query: 'red ochre pigment', expectedPaths: ['notes/watercolor-palette.md'] },
      { query: 'solar inverter battery', expectedPaths: ['notes/solar-battery.md'] },
      { query: 'roadmap launch', expectedPaths: ['notes/product-roadmap.md'] },
      {
        query: 'lantern',
        expectedPaths: ['notes/body-frequency-rich.md', 'notes/body-frequency-sparse.md'],
        bm25Only: true
      }
    ];

    for (const { query, expectedPaths, bm25Only } of cases) {
      const report = await runSearch(root, { query, area: 'sources', limit: 5 });
      const topResults = report.results.slice(0, expectedPaths.length);
      const topPaths = topResults.map((result) => result.path);

      assert.deepEqual(topPaths, expectedPaths, `query "${query}" should preserve golden ranking`);
      if (bm25Only) {
        for (const result of topResults) {
          assert.deepEqual(result.matched, ['bm25'], `query "${query}" should rank ${result.path} with BM25 only`);
        }
      }
    }
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

    assert.match(formatIndexReport(indexReport), /✓ indexed 6 Markdown files/);
    assert.match(formatSearchReport(searchReport), /^Wren search/);
    assert.match(formatSearchReport(searchReport), /Query: sky/);
    assert.match(formatSearchReport(searchReport), /matched:/);
    assert.match(
      formatSearchReport({
        query: 'example',
        area: 'all',
        searchedFiles: 2,
        results: [
          { path: 'atlas/one.md', area: 'atlas', score: 1, matched: ['bm25'] },
          { path: 'notes/two.md', area: 'source', score: 0.5, matched: ['bm25'] }
        ]
      }),
      /Result: 2 matches/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function goldenSearchFixtureVault(): Promise<string> {
  const root = await tempDir();
  await mkdir(path.join(root, 'notes'), { recursive: true });

  await writeFile(
    path.join(root, 'notes', 'fermentation-guide.md'),
    [
      '# Fermentation Guide',
      '',
      'Fermentation keeps a sourdough starter active and controls kimchi brine.',
      'Fermentation fermentation starter brine lactobacillus jar salt temperature.',
      'Use regular burping schedules for fermented vegetables.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'winter-meal-plan.md'),
    [
      '# Winter Meal Plan',
      '',
      'Plan soup, lentils, rice, and roasted carrots for the week.',
      'This grocery list mentions fermentation once as a possible pickle side dish.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'basil-irrigation.md'),
    [
      '# Basil Irrigation',
      '',
      'Basil seedlings need drip irrigation, moist soil, and morning watering.',
      'A greenhouse tray uses capillary mats and nutrient checks.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'watercolor-palette.md'),
    [
      '# Watercolor Palette',
      '',
      'Red ochre pigment granulates beside ultramarine and raw sienna.',
      'Mix transparent washes for shadow studies and plein air sketches.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'solar-battery.md'),
    [
      '# Solar Battery Sizing',
      '',
      'Solar inverter battery sizing depends on amp hours, panel watts, and reserve capacity.',
      'Track daily load before choosing a charge controller.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'product-roadmap.md'),
    [
      '# Product Roadmap',
      '',
      'Roadmap planning schedules the beta launch, onboarding checklist, and release notes.',
      'The launch decision uses support readiness and documentation coverage.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'body-frequency-rich.md'),
    [
      '# Harbor Notebook',
      '',
      'Lantern placement guides evening checks, lantern fuel rotation, and lantern wick trimming.',
      'Crews log lantern battery swaps before docking, and a final lantern audit keeps the walkway visible.'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'body-frequency-sparse.md'),
    [
      '# Orchard Notebook',
      '',
      'Lantern placement appears in the seasonal checklist while crews review gate latches, water barrels, path markers,',
      'supply bins, route maps, radio handoffs, and weather notes before dusk.'
    ].join('\n'),
    'utf8'
  );

  return root;
}

async function fixtureVault(): Promise<string> {
  const root = await tempDir();
  await writeConfig(root, {
    version: 1,
    areas: {
      recap: { path: 'recap' },
      atlas: { path: 'atlas', defaultSection: 'general' }
    },
    sources: [
      { path: 'notes', atlasSection: 'work' },
      { path: 'recap', atlasSection: 'general' }
    ],
    useBm25: true
  });

  await mkdir(path.join(root, 'atlas', 'work'), { recursive: true });
  await mkdir(path.join(root, 'notes'), { recursive: true });
  await mkdir(path.join(root, 'recap'), { recursive: true });

  await writeFile(path.join(root, 'atlas', 'index.md'), '# Wren Atlas\n\n- [[sky]] — summary about sky notes.\n', 'utf8');
  await writeFile(
    path.join(root, 'atlas', 'sky.md'),
    '# Sky Synthesis\n\nThe sky synthesis cites source notes.\n\n## Sources\n\n- [[sky]]\n',
    'utf8'
  );
  await writeFile(
    path.join(root, 'atlas', 'work', 'sky-work.md'),
    '# Work Sky Synthesis\n\nWork atlas synthesis also mentions the sky.\n\n## Sources\n\n- [[sky]]\n',
    'utf8'
  );
  await writeFile(
    path.join(root, 'notes', 'sky.md'),
    '# Important Sky Note\n\nThe sky is blue.\n\n#themostimportantnote #weather\n',
    'utf8'
  );
  await writeFile(path.join(root, 'notes', 'related.md'), '# Related Weather\n\nCloud notes.\n\n#weather\n', 'utf8');
  await writeFile(path.join(root, 'recap', 'meeting.md'), '# Meeting\n\nWe discussed unrelated planning.\n', 'utf8');

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
