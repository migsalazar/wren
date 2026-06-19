import { stat } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_PATH, WrenConfig, loadConfig } from './config.js';
import { pathExists } from './files.js';
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

  const wikiPath = config.areas.wiki[config.defaultWiki]?.path;
  if (!wikiPath) {
    checks.push(error(`default wiki not configured: ${config.defaultWiki}`));
    return summarize(checks);
  }

  checks.push(ok(`default wiki configured: ${wikiPath}`));
  await checkPath(checks, rootDir, wikiPath, 'wiki directory', 'error');
  await checkPath(checks, rootDir, path.join(wikiPath, 'index.md'), 'wiki index', 'error');
  await checkPath(checks, rootDir, path.join(wikiPath, 'log.md'), 'wiki log', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'capture.md'), 'capture workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'recall.md'), 'recall workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'reflect.md'), 'reflect workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'workflows', 'lint.md'), 'lint workflow', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'templates', 'capture.md'), 'capture template', 'error');
  await checkPath(checks, rootDir, path.join('.wren', 'templates', 'wiki.md'), 'wiki template', 'error');
  await checkPath(checks, rootDir, config.areas.capture.path, 'capture directory', 'warn');
  await checkSourceFolders(checks, rootDir, config);
  await checkUnconfiguredSourceFolders(checks, rootDir, config);
  await checkSearchIndex(checks, rootDir, config);
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
    checks.push(ok(`source configured: ${source.path}`));

    const absolutePath = path.join(rootDir, source.path);
    if (!(await pathExists(absolutePath))) {
      if (source.path !== config.areas.capture.path) checks.push(warn(`source directory missing: ${source.path}`));
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
  const wikiPaths = Object.values(config.areas.wiki).map((area) => area.path);
  const configuredSources = new Set(config.sources.map((source) => source.path));
  const candidates = await discoverTopLevelSourceFolders(rootDir, wikiPaths);

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
    checks.push(warn(`search index missing: ${status.path}`));
    return;
  }

  if (status.status === 'stale') {
    checks.push(warn(`search index stale: ${status.reason}`));
    return;
  }

  checks.push(ok(`search index fresh: ${status.documentCount} files`));
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
