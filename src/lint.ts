import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { WrenConfig, loadConfig } from './config.js';
import { pathExists, readText, toPosixPath } from './files.js';

export type LintStatus = 'warn' | 'error';

export interface LintIssue {
  status: LintStatus;
  message: string;
}

export interface LintReport {
  issues: LintIssue[];
  filesChecked: number;
  errors: number;
  warnings: number;
}

interface MarkdownFile {
  absolutePath: string;
  relativePath: string;
  area: 'capture' | 'wiki';
  content: string;
  wiki?: {
    name: string;
    root: string;
    relativePath: string;
  };
}

interface WikiWorkspace {
  name: string;
  root: string;
  relativePath: string;
  files: MarkdownFile[];
}

export async function runLint(rootDir: string): Promise<LintReport> {
  const config = await loadConfig(rootDir);
  const issues: LintIssue[] = [];
  const areaRoots = configuredAreaRoots(rootDir, config);
  const captureFiles = await readCaptureFiles(rootDir, config, issues);
  const wikiWorkspaces = await readWikiWorkspaces(rootDir, config, issues);
  const files = [...captureFiles, ...wikiWorkspaces.flatMap((workspace) => workspace.files)];
  const wikilinkTargets = buildWikilinkTargetIndex(files);

  checkEmptyFiles(files, issues);
  checkWikiSources(wikiWorkspaces, issues);
  checkWikiIndexCoverage(wikiWorkspaces, issues);
  await checkMarkdownLinks(files, areaRoots, issues);
  checkWikilinks(files, wikilinkTargets, issues);

  return summarize(issues, files.length);
}

export function formatLintReport(report: LintReport): string {
  const lines = ['Wren lint', ''];

  lines.push(`✓ checked ${report.filesChecked} Markdown file${plural(report.filesChecked)}`);

  for (const issue of report.issues) {
    lines.push(`${statusSymbol(issue.status)} ${issue.message}`);
  }

  if (report.issues.length === 0) lines.push('✓ no issues found');

  lines.push('');
  lines.push(`Result: ${report.warnings} warning${plural(report.warnings)}, ${report.errors} error${plural(report.errors)}`);

  return lines.join('\n');
}

async function readCaptureFiles(rootDir: string, config: WrenConfig, issues: LintIssue[]): Promise<MarkdownFile[]> {
  const captureRoot = path.join(rootDir, config.areas.capture.path);
  if (!(await pathExists(captureRoot))) return [];

  if (!(await isDirectory(captureRoot))) {
    issues.push(error(`capture path is not a directory: ${config.areas.capture.path}`));
    return [];
  }

  return readMarkdownFiles(rootDir, captureRoot, (absolutePath, relativePath, content) => ({
    absolutePath,
    relativePath,
    area: 'capture',
    content
  }));
}

async function readWikiWorkspaces(rootDir: string, config: WrenConfig, issues: LintIssue[]): Promise<WikiWorkspace[]> {
  const workspaces: WikiWorkspace[] = [];

  for (const [name, area] of Object.entries(config.areas.wiki)) {
    const wikiRoot = path.join(rootDir, area.path);
    if (!(await pathExists(wikiRoot))) {
      issues.push(error(`wiki directory missing: ${area.path}`));
      continue;
    }

    if (!(await isDirectory(wikiRoot))) {
      issues.push(error(`wiki path is not a directory: ${area.path}`));
      continue;
    }

    const files = await readMarkdownFiles(rootDir, wikiRoot, (absolutePath, relativePath, content) => ({
      absolutePath,
      relativePath,
      area: 'wiki',
      content,
      wiki: {
        name,
        root: wikiRoot,
        relativePath: toPosixPath(path.relative(wikiRoot, absolutePath))
      }
    }));

    if (!(await pathExists(path.join(wikiRoot, 'index.md')))) {
      issues.push(error(`wiki index missing: ${path.posix.join(area.path, 'index.md')}`));
    }

    workspaces.push({ name, root: wikiRoot, relativePath: area.path, files });
  }

  return workspaces;
}

async function readMarkdownFiles(
  rootDir: string,
  directory: string,
  build: (absolutePath: string, relativePath: string, content: string) => MarkdownFile
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  await collectMarkdownFiles(rootDir, directory, build, files);
  return files;
}

async function collectMarkdownFiles(
  rootDir: string,
  directory: string,
  build: (absolutePath: string, relativePath: string, content: string) => MarkdownFile,
  files: MarkdownFile[]
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(rootDir, absolutePath, build, files);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
    files.push(build(absolutePath, relativePath, await readText(absolutePath)));
  }
}

function checkEmptyFiles(files: MarkdownFile[], issues: LintIssue[]): void {
  for (const file of files) {
    if (file.content.trim().length > 0) continue;

    if (file.area === 'capture') {
      issues.push(warn(`empty capture note: ${file.relativePath}`));
      continue;
    }

    issues.push(error(`empty wiki page: ${file.relativePath}`));
  }
}

function checkWikiSources(workspaces: WikiWorkspace[], issues: LintIssue[]): void {
  for (const file of workspaces.flatMap((workspace) => workspace.files)) {
    if (isSpecialWikiFile(file)) continue;
    if (/^##\s+Sources\b/m.test(file.content)) continue;

    issues.push(error(`wiki page missing sources: ${file.relativePath}`));
  }
}

function checkWikiIndexCoverage(workspaces: WikiWorkspace[], issues: LintIssue[]): void {
  for (const workspace of workspaces) {
    const index = workspace.files.find((file) => file.wiki?.relativePath === 'index.md');
    if (!index) continue;

    for (const file of workspace.files) {
      if (isSpecialWikiFile(file)) continue;
      if (indexMentionsPage(index.content, file)) continue;

      issues.push(warn(`wiki page not listed in index: ${file.relativePath}`));
    }
  }
}

async function checkMarkdownLinks(files: MarkdownFile[], areaRoots: string[], issues: LintIssue[]): Promise<void> {
  for (const file of files) {
    for (const target of extractMarkdownLinkTargets(file.content)) {
      const localTarget = cleanMarkdownLinkTarget(target);
      if (!localTarget) continue;

      const absoluteTarget = path.resolve(path.dirname(file.absolutePath), localTarget);
      if (!isWithinAny(absoluteTarget, areaRoots)) continue;
      if (await pathExists(absoluteTarget)) continue;

      issues.push(error(`broken markdown link in ${file.relativePath}: ${target}`));
    }
  }
}

function checkWikilinks(files: MarkdownFile[], targets: Set<string>, issues: LintIssue[]): void {
  for (const file of files) {
    for (const target of extractWikilinkTargets(file.content)) {
      const normalizedTarget = normalizeWikilinkTarget(target);
      if (!normalizedTarget) continue;
      if (targets.has(normalizedTarget)) continue;

      issues.push(error(`broken wikilink in ${file.relativePath}: [[${target}]]`));
    }
  }
}

function buildWikilinkTargetIndex(files: MarkdownFile[]): Set<string> {
  const targets = new Set<string>();

  for (const file of files) {
    addTarget(targets, withoutMarkdownExtension(file.relativePath));
    addTarget(targets, withoutMarkdownExtension(path.posix.basename(file.relativePath)));

    if (file.wiki) {
      addTarget(targets, withoutMarkdownExtension(file.wiki.relativePath));
      addTarget(targets, `${file.wiki.name}/${withoutMarkdownExtension(file.wiki.relativePath)}`);
    }

    const title = firstHeading(file.content);
    if (title) addTarget(targets, title);
  }

  return targets;
}

function indexMentionsPage(indexContent: string, file: MarkdownFile): boolean {
  if (!file.wiki) return false;

  const wikiRelative = withoutMarkdownExtension(file.wiki.relativePath);
  const rootRelative = withoutMarkdownExtension(file.relativePath);
  const basename = withoutMarkdownExtension(path.posix.basename(file.relativePath));
  const needles = [
    file.wiki.relativePath,
    wikiRelative,
    file.relativePath,
    rootRelative,
    `[[${wikiRelative}]]`,
    `[[${basename}]]`,
    `](${file.wiki.relativePath})`,
    `](${wikiRelative}.md)`,
    `](${rootRelative}.md)`
  ];

  return needles.some((needle) => indexContent.includes(needle));
}

function extractMarkdownLinkTargets(content: string): string[] {
  const targets: string[] = [];
  const linkPattern = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(content)) !== null) {
    targets.push(match[1]);
  }

  return targets;
}

function cleanMarkdownLinkTarget(target: string): string | undefined {
  const withoutTitle = target.trim().replace(/^<(.+)>$/, '$1').split(/\s+["']/)[0];
  const withoutFragment = withoutTitle.split('#')[0].split('?')[0];
  if (!withoutFragment || withoutFragment.startsWith('#')) return undefined;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(withoutFragment)) return undefined;

  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function extractWikilinkTargets(content: string): string[] {
  const targets: string[] = [];
  const wikilinkPattern = /\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikilinkPattern.exec(content)) !== null) {
    targets.push(match[1]);
  }

  return targets;
}

function normalizeWikilinkTarget(target: string): string | undefined {
  const normalized = target
    .split('|')[0]
    .split('#')[0]
    .trim()
    .replace(/\\/g, '/');

  if (!normalized) return undefined;
  return withoutMarkdownExtension(normalized);
}

function firstHeading(content: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(content);
  return match?.[1]?.trim();
}

function isSpecialWikiFile(file: MarkdownFile): boolean {
  const relativePath = file.wiki?.relativePath;
  return relativePath === 'index.md' || relativePath === 'log.md';
}

function configuredAreaRoots(rootDir: string, config: WrenConfig): string[] {
  return [
    path.resolve(rootDir, config.areas.capture.path),
    ...Object.values(config.areas.wiki).map((area) => path.resolve(rootDir, area.path))
  ];
}

async function isDirectory(filePath: string): Promise<boolean> {
  return (await stat(filePath)).isDirectory();
}

function isWithinAny(filePath: string, roots: string[]): boolean {
  return roots.some((root) => isWithin(filePath, root));
}

function isWithin(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function withoutMarkdownExtension(filePath: string): string {
  return filePath.replace(/\.md$/i, '');
}

function addTarget(targets: Set<string>, target: string): void {
  targets.add(target.trim().replace(/\\/g, '/'));
}

function summarize(issues: LintIssue[], filesChecked: number): LintReport {
  return {
    issues,
    filesChecked,
    errors: issues.filter((issue) => issue.status === 'error').length,
    warnings: issues.filter((issue) => issue.status === 'warn').length
  };
}

function error(message: string): LintIssue {
  return { status: 'error', message };
}

function warn(message: string): LintIssue {
  return { status: 'warn', message };
}

function statusSymbol(status: LintStatus): string {
  return status === 'warn' ? '!' : '✗';
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}
