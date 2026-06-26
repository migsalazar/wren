import { stat } from 'node:fs/promises';
import path from 'node:path';
import { WREN_CACHE_GITIGNORE_CONTENT, WREN_CACHE_GITIGNORE_PATH } from './cache.js';
import { CONFIG_PATH, WrenConfig, loadConfig } from './config.js';
import { pathExists, readText } from './files.js';
import { LEARNING_CANDIDATES_DIR, listLearningCandidates } from './learning.js';
import { getSearchIndexStatus } from './search.js';
import { discoverTopLevelSourceFolders } from './sources.js';

export type DoctorStatus = 'ok' | 'warn' | 'error';

export interface DoctorCheck {
  status: DoctorStatus;
  message: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  errors: number;
  warnings: number;
}

export async function runDoctor(rootDir: string): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const configPath = path.join(rootDir, CONFIG_PATH);

  if (!(await pathExists(configPath))) {
    checks.push(error(`config missing: ${CONFIG_PATH}`));
    return summarize(checks);
  }

  checks.push(ok(`config found: ${CONFIG_PATH}`));

  let config: WrenConfig;
  try {
    config = await loadConfig(rootDir);
    checks.push(ok('config valid'));
  } catch (loadError) {
    checks.push(error(`config invalid: ${(loadError as Error).message}`));
    return summarize(checks);
  }

  const atlasPath = config.areas.atlas.path;
  checks.push(ok(`atlas configured: ${atlasPath}`));
  checks.push(ok(`atlas default section configured: ${config.areas.atlas.defaultSection}`));
  await checkPath(checks, rootDir, atlasPath, 'atlas directory', 'error');
  await checkPath(checks, rootDir, path.join(atlasPath, 'index.md'), 'atlas index', 'error');
  await checkPath(checks, rootDir, path.join(atlasPath, 'log.md'), 'atlas log', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'recap.md'), 'recap workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'recall.md'), 'recall workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'reflect.md'), 'reflect workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'templates', 'recap.md'), 'recap template', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'templates', 'atlas.md'), 'atlas template', 'error');
  await checkPath(checks, rootDir, config.areas.recap.path, 'recap directory', 'warn');
  await checkSourceFolders(checks, rootDir, config);
  await checkUnconfiguredSourceFolders(checks, rootDir, config);
  await checkSearchIndex(checks, rootDir, config);
  await checkLearningCandidates(checks, rootDir);
  await checkPath(checks, rootDir, 'AGENTS.md', 'agent instructions', 'warn');

  return summarize(checks);
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = ['Wren doctor', ''];

  for (const check of report.checks) {
    lines.push(`${statusSymbol(check.status)} ${check.message}`);
  }

  lines.push('');
  lines.push(`Result: ${report.warnings} warning${plural(report.warnings)}, ${report.errors} error${plural(report.errors)}`);

  return lines.join('\n');
}

function summarize(checks: DoctorCheck[]): DoctorReport {
  return {
    checks,
    errors: checks.filter((check) => check.status === 'error').length,
    warnings: checks.filter((check) => check.status === 'warn').length
  };
}

async function checkSourceFolders(checks: DoctorCheck[], rootDir: string, config: WrenConfig): Promise<void> {
  for (const source of config.sources) {
    const section = source.atlasSection ?? config.areas.atlas.defaultSection;
    checks.push(ok(`source configured: ${source.path} -> ${config.areas.atlas.path}/${section}`));

    const absolutePath = path.join(rootDir, source.path);
    if (!(await pathExists(absolutePath))) {
      if (source.path !== config.areas.recap.path) checks.push(warn(`source directory missing: ${source.path}`));
      continue;
    }

    if (!(await stat(absolutePath)).isDirectory()) {
      checks.push(warn(`source path is not a directory: ${source.path}`));
      continue;
    }

    checks.push(ok(`source directory exists: ${source.path}`));
  }
}

async function checkUnconfiguredSourceFolders(
  checks: DoctorCheck[],
  rootDir: string,
  config: WrenConfig
): Promise<void> {
  const configuredSources = new Set(config.sources.map((source) => source.path));
  const candidates = await discoverTopLevelSourceFolders(rootDir, [config.areas.atlas.path]);

  for (const candidate of candidates) {
    if (configuredSources.has(candidate)) continue;
    checks.push(warn(`source folder not configured: ${candidate} (review sources in ${CONFIG_PATH})`));
  }
}

async function checkSearchIndex(checks: DoctorCheck[], rootDir: string, config: WrenConfig): Promise<void> {
  const status = await getSearchIndexStatus(rootDir, config);

  if (status.status === 'disabled') {
    checks.push(ok('BM25 recall disabled'));
    return;
  }

  checks.push(ok('BM25 recall enabled'));

  if (status.status === 'missing') {
    checks.push(warn(`search index missing: ${status.path} (run: wren index)`));
    return;
  }

  if (status.status === 'stale') {
    checks.push(warn(`search index stale: ${status.reason} (run: wren index)`));
    return;
  }

  checks.push(ok(`search index fresh: ${status.documentCount} files`));
}

async function checkLearningCandidates(checks: DoctorCheck[], rootDir: string): Promise<void> {
  const records = await listLearningCandidates(rootDir);
  if (records.length === 0) {
    checks.push(ok(`learning candidates: none (${LEARNING_CANDIDATES_DIR})`));
    return;
  }

  await checkLearningCacheGitignore(checks, rootDir);

  const invalid = records.filter((record) => record.issues.length > 0);
  const valid = records.length - invalid.length;

  if (valid > 0) {
    checks.push(ok(`learning candidates pending: ${valid} (review with: wren learn list)`));
  }

  for (const record of invalid) {
    checks.push(warn(`learning candidate invalid: ${record.relativePath} (${record.issues.join('; ')})`));
  }
}

async function checkLearningCacheGitignore(checks: DoctorCheck[], rootDir: string): Promise<void> {
  const gitignorePath = path.join(rootDir, WREN_CACHE_GITIGNORE_PATH);
  if (!(await pathExists(gitignorePath))) {
    checks.push(warn(`learning candidate cache is not ignored: ${WREN_CACHE_GITIGNORE_PATH} missing`));
    return;
  }

  const content = await readText(gitignorePath);
  if (content !== WREN_CACHE_GITIGNORE_CONTENT) {
    checks.push(warn(`learning candidate cache is not ignored: ${WREN_CACHE_GITIGNORE_PATH} has unexpected content`));
  }
}

async function checkPath(
  checks: DoctorCheck[],
  rootDir: string,
  relativePath: string,
  label: string,
  missingStatus: 'warn' | 'error'
): Promise<void> {
  const exists = await pathExists(path.join(rootDir, relativePath));
  if (exists) {
    checks.push(ok(`${label} exists: ${relativePath}`));
    return;
  }

  const message = `${label} missing: ${relativePath}`;
  checks.push(missingStatus === 'warn' ? warn(message) : error(message));
}

function ok(message: string): DoctorCheck {
  return { status: 'ok', message };
}

function warn(message: string): DoctorCheck {
  return { status: 'warn', message };
}

function error(message: string): DoctorCheck {
  return { status: 'error', message };
}

function statusSymbol(status: DoctorStatus): string {
  if (status === 'ok') return '✓';
  if (status === 'warn') return '!';
  return '✗';
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}
