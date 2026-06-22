import { createHash } from 'node:crypto';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureWrenCache, WREN_CACHE_PATH } from './cache.js';
import { WrenConfig } from './config.js';
import { pathExists, readText, toPosixPath } from './files.js';
import { countTerms, extractHeadings, extractTags, tokenize } from './search-text.js';
import { isHiddenOrSystemPath } from './sources.js';

export type IndexedArea = 'wiki' | 'source';

export interface IndexedDocument {
  path: string;
  area: IndexedArea;
  title: string;
  headings: string[];
  tags: string[];
  tokenCount: number;
  terms: Record<string, number>;
  mtimeMs: number;
  size: number;
}

export interface SearchIndex {
  version: 1;
  generatedAt: string;
  configHash: string;
  documents: IndexedDocument[];
}

interface IndexedFile {
  absolutePath: string;
  relativePath: string;
  area: IndexedArea;
  mtimeMs: number;
  size: number;
}

export interface IndexReport {
  indexPath: string;
  documentCount: number;
  wikiCount: number;
  sourceCount: number;
  warnings: string[];
}

export type SearchIndexStatus =
  | { status: 'disabled' }
  | { status: 'missing'; path: string }
  | { status: 'stale'; path: string; reason: string; documentCount: number }
  | { status: 'fresh'; path: string; documentCount: number };

export const SEARCH_INDEX_PATH = path.join(WREN_CACHE_PATH, 'search-index.json');

export async function buildAndWriteSearchIndex(rootDir: string, config: WrenConfig): Promise<IndexReport> {
  const { index, warnings } = await buildSearchIndex(rootDir, config);
  await writeSearchIndex(rootDir, index);

  return {
    indexPath: SEARCH_INDEX_PATH,
    documentCount: index.documents.length,
    wikiCount: index.documents.filter((document) => document.area === 'wiki').length,
    sourceCount: index.documents.filter((document) => document.area === 'source').length,
    warnings
  };
}

export async function buildSearchIndex(
  rootDir: string,
  config: WrenConfig
): Promise<{ index: SearchIndex; warnings: string[] }> {
  const warnings: string[] = [];
  const files = await collectIndexedFiles(rootDir, config, warnings);
  const documents: IndexedDocument[] = [];

  for (const file of files) {
    const content = await readText(file.absolutePath);
    const parsed = parseMarkdownDocument(file.relativePath, content);
    documents.push({
      path: file.relativePath,
      area: file.area,
      title: parsed.title,
      headings: parsed.headings,
      tags: parsed.tags,
      tokenCount: parsed.tokens.length,
      terms: countTerms(parsed.tokens),
      mtimeMs: file.mtimeMs,
      size: file.size
    });
  }

  return {
    index: {
      version: 1,
      generatedAt: new Date().toISOString(),
      configHash: hashSearchConfig(config),
      documents
    },
    warnings
  };
}

export async function writeSearchIndex(rootDir: string, index: SearchIndex): Promise<void> {
  const indexPath = path.join(rootDir, SEARCH_INDEX_PATH);
  await ensureWrenCache(rootDir);
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

export async function readSearchIndex(rootDir: string): Promise<SearchIndex> {
  const indexPath = path.join(rootDir, SEARCH_INDEX_PATH);
  if (!(await pathExists(indexPath))) throw new Error(`Search index missing. Run: wren index`);

  const parsed = JSON.parse(await readText(indexPath)) as unknown;
  if (!isSearchIndex(parsed)) throw new Error(`Search index invalid. Run: wren index`);
  return parsed;
}

export async function getSearchIndexStatus(rootDir: string, config: WrenConfig): Promise<SearchIndexStatus> {
  if (!config.useBm25) return { status: 'disabled' };

  const indexPath = path.join(rootDir, SEARCH_INDEX_PATH);
  if (!(await pathExists(indexPath))) return { status: 'missing', path: SEARCH_INDEX_PATH };

  let index: SearchIndex;
  try {
    index = await readSearchIndex(rootDir);
  } catch (error) {
    return { status: 'stale', path: SEARCH_INDEX_PATH, reason: (error as Error).message, documentCount: 0 };
  }

  if (index.configHash !== hashSearchConfig(config)) {
    return {
      status: 'stale',
      path: SEARCH_INDEX_PATH,
      reason: 'configured wiki or source folders changed',
      documentCount: index.documents.length
    };
  }

  const warnings: string[] = [];
  const currentFiles = await collectIndexedFiles(rootDir, config, warnings);
  const currentByPath = new Map(currentFiles.map((file) => [file.relativePath, file]));
  const indexedByPath = new Map(index.documents.map((document) => [document.path, document]));

  for (const file of currentFiles) {
    const indexed = indexedByPath.get(file.relativePath);
    if (!indexed) return stale(index, `new Markdown file: ${file.relativePath}`);
    if (indexed.size !== file.size || indexed.mtimeMs !== file.mtimeMs) {
      return stale(index, `changed Markdown file: ${file.relativePath}`);
    }
  }

  for (const document of index.documents) {
    if (!currentByPath.has(document.path)) return stale(index, `missing Markdown file: ${document.path}`);
  }

  return { status: 'fresh', path: SEARCH_INDEX_PATH, documentCount: index.documents.length };
}

function stale(index: SearchIndex, reason: string): SearchIndexStatus {
  return { status: 'stale', path: SEARCH_INDEX_PATH, reason, documentCount: index.documents.length };
}

async function collectIndexedFiles(
  rootDir: string,
  config: WrenConfig,
  warnings: string[]
): Promise<IndexedFile[]> {
  const files = new Map<string, IndexedFile>();

  for (const wiki of Object.values(config.areas.wiki)) {
    await collectAreaFiles({
      rootDir,
      relativeRoot: wiki.path,
      area: 'wiki',
      files,
      warnings,
      missingIsWarning: true
    });
  }

  for (const source of config.sources) {
    await collectAreaFiles({
      rootDir,
      relativeRoot: source.path,
      area: 'source',
      files,
      warnings,
      missingIsWarning: source.path !== config.areas.capture.path
    });
  }

  return [...files.values()].sort((first, second) => first.relativePath.localeCompare(second.relativePath));
}

interface CollectAreaFilesOptions {
  rootDir: string;
  relativeRoot: string;
  area: IndexedArea;
  files: Map<string, IndexedFile>;
  warnings: string[];
  missingIsWarning: boolean;
}

async function collectAreaFiles(options: CollectAreaFilesOptions): Promise<void> {
  const { rootDir, relativeRoot, area, files, warnings, missingIsWarning } = options;
  const absoluteRoot = path.join(rootDir, relativeRoot);
  if (!(await pathExists(absoluteRoot))) {
    if (missingIsWarning) warnings.push(`${area} directory missing: ${relativeRoot}`);
    return;
  }

  const rootStat = await stat(absoluteRoot);
  if (!rootStat.isDirectory()) {
    warnings.push(`${area} path is not a directory: ${relativeRoot}`);
    return;
  }

  await collectMarkdownFiles(rootDir, absoluteRoot, files, area);
}

async function collectMarkdownFiles(
  rootDir: string,
  directory: string,
  files: Map<string, IndexedFile>,
  area: IndexedArea
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toPosixPath(path.relative(rootDir, absolutePath));

    if (entry.isDirectory()) {
      if (isHiddenOrSystemPath(relativePath)) continue;
      await collectMarkdownFiles(rootDir, absolutePath, files, area);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const fileStat = await stat(absolutePath);
    files.set(relativePath, {
      absolutePath,
      relativePath,
      area,
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size
    });
  }
}

interface ParsedDocument {
  title: string;
  headings: string[];
  tags: string[];
  tokens: string[];
}

function parseMarkdownDocument(relativePath: string, content: string): ParsedDocument {
  const headings = extractHeadings(content);
  const title = headings.find((heading) => heading.level === 1)?.text ?? path.posix.basename(relativePath, '.md');
  const tags = extractTags(content);
  const tokens = tokenize([title, ...headings.map((heading) => heading.text), ...tags, content].join('\n'));

  return {
    title,
    headings: headings.map((heading) => heading.text),
    tags,
    tokens
  };
}

function hashSearchConfig(config: WrenConfig): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        areas: config.areas,
        sources: config.sources
      })
    )
    .digest('hex');
}

function isSearchIndex(value: unknown): value is SearchIndex {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    typeof value.generatedAt === 'string' &&
    typeof value.configHash === 'string' &&
    Array.isArray(value.documents) &&
    value.documents.every(isIndexedDocument)
  );
}

function isIndexedDocument(value: unknown): value is IndexedDocument {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === 'string' &&
    (value.area === 'wiki' || value.area === 'source') &&
    typeof value.title === 'string' &&
    Array.isArray(value.headings) &&
    value.headings.every((heading) => typeof heading === 'string') &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    typeof value.tokenCount === 'number' &&
    isRecord(value.terms) &&
    Object.values(value.terms).every((count) => typeof count === 'number') &&
    typeof value.mtimeMs === 'number' &&
    typeof value.size === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
