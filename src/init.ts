import path from 'node:path';
import { CONFIG_PATH } from './config.js';
import { readText, writeNewText } from './files.js';
import { discoverTopLevelSourceFolders, uniquePaths } from './sources.js';

interface InitResult {
  created: string[];
  skipped: string[];
  configuredSources?: string[];
}

const DEFAULT_RECAP_PATH = 'recap';
const DEFAULT_ATLAS_PATH = 'atlas';
const DEFAULT_ATLAS_SECTION = 'general';
const RESERVED_ATLAS_ROOT_FILES = new Set(['index.md', 'log.md']);

const TEMPLATE_FILES = [
  { from: path.join('templates', '.wren', 'workflows', 'recap.md'), to: path.join('.wren', 'workflows', 'recap.md') },
  { from: path.join('templates', '.wren', 'workflows', 'recall.md'), to: path.join('.wren', 'workflows', 'recall.md') },
  { from: path.join('templates', '.wren', 'workflows', 'reflect.md'), to: path.join('.wren', 'workflows', 'reflect.md') },
  { from: path.join('templates', '.wren', 'templates', 'recap.md'), to: path.join('.wren', 'templates', 'recap.md') },
  { from: path.join('templates', '.wren', 'templates', 'atlas.md'), to: path.join('.wren', 'templates', 'atlas.md') },
  { from: path.join('templates', 'atlas', 'index.md'), to: path.join('atlas', 'index.md') },
  { from: path.join('templates', 'atlas', 'log.md'), to: path.join('atlas', 'log.md') },
  { from: path.join('templates', 'AGENTS.md'), to: 'AGENTS.md' }
];

export async function initWren(rootDir: string, packageRoot: string): Promise<InitResult> {
  const result: InitResult = { created: [], skipped: [] };
  const config = await buildInitialConfig(rootDir);
  const configStatus = await writeNewText(path.join(rootDir, CONFIG_PATH), config.content);

  result[configStatus].push(CONFIG_PATH);
  if (configStatus === 'created') result.configuredSources = config.sources;

  for (const file of TEMPLATE_FILES) {
    const content = await readText(path.join(packageRoot, file.from));
    const status = await writeNewText(path.join(rootDir, file.to), content);
    result[status].push(file.to);
  }

  return result;
}

export function formatInitResult(result: InitResult): string {
  const lines = ['Wren initialized.', ''];

  if (result.created.length > 0) {
    lines.push('Created:');
    for (const file of result.created) lines.push(`  ${file}`);
    lines.push('');
  }

  if (result.skipped.length > 0) {
    lines.push('Skipped existing files:');
    for (const file of result.skipped) lines.push(`  ${file}`);
    lines.push('');
  }

  if (result.configuredSources && result.configuredSources.length > 0) {
    lines.push('Configured source folders:');
    for (const source of result.configuredSources) lines.push(`  ${source}`);
    lines.push(`Review them in ${CONFIG_PATH}.`);
    lines.push('');
  }

  lines.push('Next:');
  lines.push('  wren index');
  lines.push('  Use /wren recap with a Wren agent adapter, or ask an agent to follow .wren/workflows/recap.md');
  lines.push('  wren doctor');

  return lines.join('\n');
}

async function buildInitialConfig(rootDir: string): Promise<{ content: string; sources: string[] }> {
  const discoveredSources = await discoverTopLevelSourceFolders(rootDir, [DEFAULT_ATLAS_PATH]);
  const sources = uniquePaths([DEFAULT_RECAP_PATH, ...discoveredSources]);
  const config = {
    version: 1,
    areas: {
      recap: { path: DEFAULT_RECAP_PATH },
      atlas: { path: DEFAULT_ATLAS_PATH, defaultSection: DEFAULT_ATLAS_SECTION }
    },
    sources: sources.map((sourcePath) => ({
      path: sourcePath,
      atlasSection: atlasSectionForSourcePath(sourcePath)
    })),
    useBm25: true
  };

  return { content: `${JSON.stringify(config, null, 2)}\n`, sources };
}

function atlasSectionForSourcePath(sourcePath: string): string {
  if (sourcePath === DEFAULT_RECAP_PATH) return DEFAULT_ATLAS_SECTION;
  if (RESERVED_ATLAS_ROOT_FILES.has(sourcePath.toLowerCase())) return `source-${path.posix.basename(sourcePath, '.md')}`;
  return sourcePath;
}
