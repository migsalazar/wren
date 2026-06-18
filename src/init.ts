import path from 'node:path';
import { readText, writeNewText } from './files.js';

interface InitResult {
  created: string[];
  skipped: string[];
}

const TEMPLATE_FILES = [
  { from: path.join('templates', '.wren', 'config.json'), to: path.join('.wren', 'config.json') },
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

  lines.push('Next:');
  lines.push('  Use /wren capture with an agent in this vault');
  lines.push('  wren doctor');

  return lines.join('\n');
}
