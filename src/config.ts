import path from 'node:path';
import { readText } from './files.js';

export interface WrenConfig {
  version: number;
  areas: {
    capture: {
      path: string;
    };
    wiki: Record<string, { path: string }>;
  };
  defaultWiki: string;
}

export const CONFIG_PATH = path.join('.wren', 'config.json');

export async function loadConfig(rootDir: string): Promise<WrenConfig> {
  const configPath = path.join(rootDir, CONFIG_PATH);
  let parsed: unknown;

  try {
    parsed = JSON.parse(await readText(configPath));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`No ${CONFIG_PATH} found. Run: wren init`);
    }
    throw new Error(`Could not read ${CONFIG_PATH}: ${(error as Error).message}`);
  }

  return validateConfig(parsed);
}

function validateConfig(value: unknown): WrenConfig {
  if (!isRecord(value)) throw new Error(`${CONFIG_PATH} must be a JSON object.`);
  if (value.version !== 1) throw new Error(`${CONFIG_PATH} must set "version": 1.`);
  if (!isRecord(value.areas)) throw new Error(`${CONFIG_PATH} must define areas.`);
  if (!isRecord(value.areas.capture)) throw new Error(`${CONFIG_PATH} must define areas.capture.`);
  if (typeof value.areas.capture.path !== 'string' || value.areas.capture.path.length === 0) {
    throw new Error(`${CONFIG_PATH} must define areas.capture.path.`);
  }
  const capturePath = validateRelativePath(value.areas.capture.path, 'areas.capture.path');
  if (!isRecord(value.areas.wiki)) throw new Error(`${CONFIG_PATH} must define areas.wiki.`);
  if (typeof value.defaultWiki !== 'string' || value.defaultWiki.length === 0) {
    throw new Error(`${CONFIG_PATH} must define defaultWiki.`);
  }
  const defaultWiki = value.defaultWiki;
  if (!isRecord(value.areas.wiki[defaultWiki])) {
    throw new Error(`${CONFIG_PATH} defaultWiki must reference an area in areas.wiki.`);
  }

  const wikiAreas: Record<string, { path: string }> = {};
  const wikiPaths = new Map<string, string>();
  for (const [name, wiki] of Object.entries(value.areas.wiki)) {
    if (!isRecord(wiki)) throw new Error(`${CONFIG_PATH} areas.wiki.${name} must be a JSON object.`);
    if (typeof wiki.path !== 'string' || wiki.path.length === 0) {
      throw new Error(`${CONFIG_PATH} must define areas.wiki.${name}.path.`);
    }
    const wikiPath = validateRelativePath(wiki.path, `areas.wiki.${name}.path`);
    wikiAreas[name] = { path: wikiPath };
    wikiPaths.set(name, wikiPath);
  }

  validateAreaBoundaries(capturePath, wikiPaths);

  return {
    version: 1,
    areas: {
      capture: { path: capturePath },
      wiki: wikiAreas
    },
    defaultWiki
  };
}

function validateRelativePath(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`${CONFIG_PATH} ${field} must not be empty.`);
  if (trimmed !== value) throw new Error(`${CONFIG_PATH} ${field} must not contain surrounding whitespace.`);
  if (path.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    throw new Error(`${CONFIG_PATH} ${field} must be a relative path.`);
  }

  const segments = trimmed.split(/[\\/]/);
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(`${CONFIG_PATH} ${field} must not contain empty path segments.`);
  }
  if (segments.includes('.')) throw new Error(`${CONFIG_PATH} ${field} must not contain ".".`);
  if (segments.includes('..')) throw new Error(`${CONFIG_PATH} ${field} must not contain "..".`);

  return segments.join('/');
}

function validateAreaBoundaries(capturePath: string, wikiPaths: Map<string, string>): void {
  for (const [name, wikiPath] of wikiPaths) {
    if (pathsOverlap(capturePath, wikiPath)) {
      throw new Error(`${CONFIG_PATH} areas.capture.path must not overlap areas.wiki.${name}.path.`);
    }
  }
}

function pathsOverlap(first: string, second: string): boolean {
  return first === second || first.startsWith(`${second}/`) || second.startsWith(`${first}/`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
