import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { pathExists, readText, toPosixPath } from './files.js';
import { buildAndWriteSearchIndex } from './search-index.js';

interface CaptureOptions {
  title?: string;
  body?: string;
  tags?: string[];
}

const CAPTURE_TEMPLATE_PATH = path.join('.wren', 'templates', 'capture.md');

export async function capture(rootDir: string, options: CaptureOptions): Promise<string> {
  const config = await loadConfig(rootDir);
  const now = new Date();
  const title = options.title?.trim() || 'Capture';
  const date = formatDate(now);
  const filename = await nextCaptureFilename(rootDir, config.areas.capture.path, now, title);
  const template = await readCaptureTemplate(rootDir);
  const content = template
    .replaceAll('{{title}}', title)
    .replaceAll('{{date}}', date)
    .replaceAll('{{body}}', formatBody(options.body))
    .replaceAll('{{tags}}', formatTags(options.tags));

  const capturePath = path.join(rootDir, config.areas.capture.path, filename);
  await mkdir(path.dirname(capturePath), { recursive: true });
  await writeFile(capturePath, content, 'utf8');
  if (config.useBm25) await buildAndWriteSearchIndex(rootDir, config);

  return toPosixPath(path.relative(rootDir, capturePath));
}

async function readCaptureTemplate(rootDir: string): Promise<string> {
  try {
    return await readText(path.join(rootDir, CAPTURE_TEMPLATE_PATH));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`No ${CAPTURE_TEMPLATE_PATH} found. Run: wren init`);
    }
    throw error;
  }
}

async function nextCaptureFilename(rootDir: string, captureDir: string, date: Date, title: string): Promise<string> {
  const base = `${formatDate(date)}-${formatTime(date)}-${slugify(title) || 'capture'}`;
  let candidate = `${base}.md`;
  let counter = 2;

  while (await pathExists(path.join(rootDir, captureDir, candidate))) {
    candidate = `${base}-${counter}.md`;
    counter += 1;
  }

  return candidate;
}

function formatBody(body: string | undefined): string {
  const trimmed = body?.trim();
  if (!trimmed) {
    return ['## Summary', '', '## Assumptions', '', '## Disagreements / Tensions'].join('\n');
  }

  return trimmed;
}

function formatTags(tags: string[] | undefined): string {
  const normalized = [...new Set((tags ?? []).map((tag) => normalizeTag(tag)).filter((tag) => tag.length > 0))];
  if (normalized.length === 0) return '';
  return normalized.map((tag) => `#${tag}`).join(' ');
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatDate(date: Date): string {
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
