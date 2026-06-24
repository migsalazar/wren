import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CONFIG_PATH, loadConfig } from './config.js';

test('loadConfig reports missing config with init guidance', async () => {
  const root = await tempDir();
  try {
    await assert.rejects(loadConfig(root), /No \.wren\/config\.json found\. Run: wren init/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig validates required Wren areas', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, { version: 1, areas: {} });

    await assert.rejects(loadConfig(root), /must define areas\.recap/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig parses valid config with atlas section mappings', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [
        { path: 'recap', atlasSection: 'learnings' },
        { path: 'work', atlasSection: 'work' },
        { path: 'books', atlasSection: 'learnings' }
      ],
      useBm25: true
    });

    const config = await loadConfig(root);

    assert.equal(config.version, 1);
    assert.equal(config.areas.recap.path, 'recap');
    assert.equal(config.areas.atlas.path, 'atlas');
    assert.equal(config.areas.atlas.defaultSection, 'general');
    assert.deepEqual(config.sources, [
      { path: 'recap', atlasSection: 'learnings' },
      { path: 'work', atlasSection: 'work' },
      { path: 'books', atlasSection: 'learnings' }
    ]);
    assert.equal(config.useBm25, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects unsafe configured paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: '../recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.recap\.path must not contain "\.\."/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects absolute atlas paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: '/tmp/atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.atlas\.path must be a relative path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects hidden or system area roots', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: '.wren/recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.recap\.path must not point to a hidden or system folder/);

    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'node_modules/atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.atlas\.path must not point to a hidden or system folder/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects invalid default atlas sections', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: '../general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.atlas\.defaultSection must not contain "\.\."/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects atlas sections that collide with root atlas files', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'index.md' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.atlas\.defaultSection must not start with reserved atlas file name: index\.md/);

    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [{ path: 'recap', atlasSection: 'log.md/archive' }]
    });

    await assert.rejects(loadConfig(root), /sources\[0\]\.atlasSection must not start with reserved atlas file name: log\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects paths with surrounding whitespace', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: ' recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.recap\.path must not contain surrounding whitespace/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects overlapping recap and atlas paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'atlas/recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.recap\.path must not overlap areas\.atlas\.path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects empty path segments', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap//daily' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    await assert.rejects(loadConfig(root), /areas\.recap\.path must not contain empty path segments/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig defaults missing useBm25 to false', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    const config = await loadConfig(root);

    assert.equal(config.useBm25, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects non-boolean useBm25', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      useBm25: 'yes'
    });

    await assert.rejects(loadConfig(root), /useBm25 must be a boolean/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig defaults missing sources to the recap path and default atlas section', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      }
    });

    const config = await loadConfig(root);

    assert.deepEqual(config.sources, [{ path: 'recap', atlasSection: 'general' }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects source paths that overlap atlas paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [{ path: 'atlas' }]
    });

    await assert.rejects(loadConfig(root), /sources\[0\]\.path must not overlap areas\.atlas\.path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects hidden source paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [{ path: '.obsidian' }]
    });

    await assert.rejects(loadConfig(root), /sources\[0\]\.path must not point to a hidden or system folder/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects invalid source atlas sections', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [{ path: 'recap', atlasSection: '.hidden' }]
    });

    await assert.rejects(loadConfig(root), /sources\[0\]\.atlasSection must not point to a hidden or system folder/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects duplicate source paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        recap: { path: 'recap' },
        atlas: { path: 'atlas', defaultSection: 'general' }
      },
      sources: [{ path: 'notes' }, { path: 'notes' }]
    });

    await assert.rejects(loadConfig(root), /sources must not contain duplicate paths: notes/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeConfig(root: string, value: unknown): Promise<void> {
  const configPath = path.join(root, CONFIG_PATH);
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(value), 'utf8');
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'wren-config-test-'));
}
