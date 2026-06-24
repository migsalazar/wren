import path from 'node:path';
import { readText } from './files.js';
import { isHiddenOrSystemPath, pathsOverlap } from './sources.js';

export interface SourceArea {
  path: string;
  atlasSection?: string;
}

export interface WrenConfig {
  version: number;
  areas: {
    recap: {
      path: string;
    };
    atlas: {
      path: string;
      defaultSection: string;
    };
  };
  sources: SourceArea[];
  useBm25: boolean;
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
  if (!isRecord(value.areas.recap)) throw new Error(`${CONFIG_PATH} must define areas.recap.`);
  if (typeof value.areas.recap.path !== 'string' || value.areas.recap.path.length === 0) {
    throw new Error(`${CONFIG_PATH} must define areas.recap.path.`);
  }
  const recapPath = validateAreaPath(value.areas.recap.path, 'areas.recap.path');

  if (!isRecord(value.areas.atlas)) throw new Error(`${CONFIG_PATH} must define areas.atlas.`);
  if (typeof value.areas.atlas.path !== 'string' || value.areas.atlas.path.length === 0) {
    throw new Error(`${CONFIG_PATH} must define areas.atlas.path.`);
  }
  const atlasPath = validateAreaPath(value.areas.atlas.path, 'areas.atlas.path');

  if (typeof value.areas.atlas.defaultSection !== 'string' || value.areas.atlas.defaultSection.length === 0) {
    throw new Error(`${CONFIG_PATH} must define areas.atlas.defaultSection.`);
  }
  const defaultSection = validateAtlasSection(value.areas.atlas.defaultSection, 'areas.atlas.defaultSection');

  validateAreaBoundaries(recapPath, atlasPath);
  const sources = validateSources(value.sources, recapPath, atlasPath, defaultSection);
  const useBm25 = validateUseBm25(value.useBm25);

  return {
    version: 1,
    areas: {
      recap: { path: recapPath },
      atlas: { path: atlasPath, defaultSection }
    },
    sources,
    useBm25
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

function validateAreaPath(value: string, field: string): string {
  const areaPath = validateRelativePath(value, field);
  if (isHiddenOrSystemPath(areaPath)) {
    throw new Error(`${CONFIG_PATH} ${field} must not point to a hidden or system folder.`);
  }
  return areaPath;
}

function validateAtlasSection(value: string, field: string): string {
  const section = validateRelativePath(value, field);
  if (isHiddenOrSystemPath(section)) {
    throw new Error(`${CONFIG_PATH} ${field} must not point to a hidden or system folder.`);
  }

  const firstSegment = section.split('/')[0]?.toLowerCase();
  if (firstSegment === 'index.md' || firstSegment === 'log.md') {
    throw new Error(`${CONFIG_PATH} ${field} must not start with reserved atlas file name: ${firstSegment}.`);
  }

  return section;
}

function validateAreaBoundaries(recapPath: string, atlasPath: string): void {
  if (pathsOverlap(recapPath, atlasPath)) {
    throw new Error(`${CONFIG_PATH} areas.recap.path must not overlap areas.atlas.path.`);
  }
}

function validateUseBm25(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new Error(`${CONFIG_PATH} useBm25 must be a boolean.`);
  return value;
}

function validateSources(value: unknown, recapPath: string, atlasPath: string, defaultSection: string): SourceArea[] {
  if (value === undefined) return [{ path: recapPath, atlasSection: defaultSection }];
  if (!Array.isArray(value)) throw new Error(`${CONFIG_PATH} sources must be an array.`);
  if (value.length === 0) throw new Error(`${CONFIG_PATH} sources must not be empty.`);

  const sources: SourceArea[] = [];
  const seen = new Set<string>();

  for (const [index, source] of value.entries()) {
    if (!isRecord(source)) throw new Error(`${CONFIG_PATH} sources[${index}] must be a JSON object.`);
    if (typeof source.path !== 'string' || source.path.length === 0) {
      throw new Error(`${CONFIG_PATH} must define sources[${index}].path.`);
    }

    const sourcePath = validateRelativePath(source.path, `sources[${index}].path`);
    if (isHiddenOrSystemPath(sourcePath)) {
      throw new Error(`${CONFIG_PATH} sources[${index}].path must not point to a hidden or system folder.`);
    }

    if (pathsOverlap(sourcePath, atlasPath)) {
      throw new Error(`${CONFIG_PATH} sources[${index}].path must not overlap areas.atlas.path.`);
    }

    if (seen.has(sourcePath)) throw new Error(`${CONFIG_PATH} sources must not contain duplicate paths: ${sourcePath}.`);
    seen.add(sourcePath);

    const atlasSection = validateOptionalAtlasSection(source.atlasSection, `sources[${index}].atlasSection`);
    sources.push(atlasSection ? { path: sourcePath, atlasSection } : { path: sourcePath });
  }

  return sources;
}

function validateOptionalAtlasSection(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${CONFIG_PATH} must define ${field}.`);
  return validateAtlasSection(value, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
