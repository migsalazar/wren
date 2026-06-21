import path from 'node:path';
import { CONFIG_PATH } from './config.js';
import { readText, writeNewText } from './files.js';
import { discoverTopLevelSourceFolders, uniquePaths } from './sources.js';

interface InitResult {
  created: string[];
  skipped: string[];
  configuredSources?: string[];
}

const DEFAULT_CAPTURE_PATH = 'capture';
const DEFAULT_WIKI_NAME = 'default';
const DEFAULT_WIKI_PATH = 'wiki';

const TEMPLATE_FILES = [
  { from: path.join('templates', '.wren', 'workflows', 'capture.md'), to: path.join('.wren', 'workflows', 'capture.md') },
  { from: path.join('templates', '.wren', 'workflows', 'recall.md'), to: path.join('.wren', 'workflows', 'recall.md') },
  { from: path.join('templates', '.wren', 'workflows', 'reflect.md'), to: path.join('.wren', 'workflows', 'reflect.md') },
  { from: path.join('templates', '.wren', 'workflows', 'lint.md'), to: path.join('.wren', 'workflows', 'lint.md') },
  { from: path.join('templates', '.wren', 'templates', 'capture.md'), to: path.join('.wren', 'templates', 'capture.md') },
  { from: path.join('templates', '.wren', 'templates', 'wiki.md'), to: path.join('.wren', 'templates', 'wiki.md') },
  { from: path.join('templates', 'wiki', 'index.md'), to: path.join('wiki', 'index.md') },
  { from: path.join('templates', 'wiki', 'log.md'), to: path.join('wiki', 'log.md') },
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
  lines.push('  Use /wren capture with a Wren agent adapter, or ask an agent to follow .wren/workflows/capture.md');
  lines.push('  wren doctor');

  return lines.join('\n');
}

async function buildInitialConfig(rootDir: string): Promise<{ content: string; sources: string[] }> {
  const discoveredSources = await discoverTopLevelSourceFolders(rootDir, [DEFAULT_WIKI_PATH]);
  const sources = uniquePaths([DEFAULT_CAPTURE_PATH, ...discoveredSources]);
  const config = {
    version: 1,
    areas: {
      capture: { path: DEFAULT_CAPTURE_PATH },
      wiki: { [DEFAULT_WIKI_NAME]: { path: DEFAULT_WIKI_PATH } }
    },
    sources: sources.map((sourcePath) => ({ path: sourcePath })),
    useBm25: true,
    defaultWiki: DEFAULT_WIKI_NAME
  };

  return { content: `${JSON.stringify(config, null, 2)}\n`, sources };
}
