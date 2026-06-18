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
    await writeConfig(root, { version: 1, areas: {}, defaultWiki: 'default' });

    await assert.rejects(loadConfig(root), /must define areas\.capture/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig parses valid config', async () => {
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

    const config = await loadConfig(root);

    assert.equal(config.version, 1);
    assert.equal(config.areas.capture.path, 'capture');
    assert.equal(config.areas.wiki.default.path, 'wiki');
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
        capture: { path: '../capture' },
        wiki: { default: { path: 'wiki' } }
      },
      defaultWiki: 'default'
    });

    await assert.rejects(loadConfig(root), /areas\.capture\.path must not contain "\.\."/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects absolute wiki paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        capture: { path: 'capture' },
        wiki: { default: { path: '/tmp/wiki' } }
      },
      defaultWiki: 'default'
    });

    await assert.rejects(loadConfig(root), /areas\.wiki\.default\.path must be a relative path/);
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
        capture: { path: ' capture' },
        wiki: { default: { path: 'wiki' } }
      },
      defaultWiki: 'default'
    });

    await assert.rejects(loadConfig(root), /areas\.capture\.path must not contain surrounding whitespace/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loadConfig rejects overlapping capture and wiki paths', async () => {
  const root = await tempDir();
  try {
    await writeConfig(root, {
      version: 1,
      areas: {
        capture: { path: 'wiki/capture' },
        wiki: { default: { path: 'wiki' } }
      },
      defaultWiki: 'default'
    });

    await assert.rejects(loadConfig(root), /areas\.capture\.path must not overlap areas\.wiki\.default\.path/);
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
        capture: { path: 'capture//daily' },
        wiki: { default: { path: 'wiki' } }
      },
      defaultWiki: 'default'
    });

    await assert.rejects(loadConfig(root), /areas\.capture\.path must not contain empty path segments/);
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
