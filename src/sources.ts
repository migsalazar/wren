import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { toPosixPath } from './files.js';

const SYSTEM_SOURCE_FOLDER_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'tmp',
  'temp'
]);

export async function discoverTopLevelSourceFolders(rootDir: string, atlasPaths: string[]): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const folders: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const relativePath = toPosixPath(entry.name);
    if (isExcludedSourcePath(relativePath, atlasPaths)) continue;
    if (!(await directoryContainsMarkdown(path.join(rootDir, relativePath), relativePath, atlasPaths))) continue;

    folders.push(relativePath);
  }

  return folders.sort((first, second) => first.localeCompare(second));
}

export function isHiddenOrSystemPath(relativePath: string): boolean {
  return relativePath.split('/').some((segment) => segment.startsWith('.') || SYSTEM_SOURCE_FOLDER_NAMES.has(segment));
}

export function pathsOverlap(first: string, second: string): boolean {
  return first === second || first.startsWith(`${second}/`) || second.startsWith(`${first}/`);
}

export function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

function isExcludedSourcePath(relativePath: string, atlasPaths: string[]): boolean {
  return isHiddenOrSystemPath(relativePath) || atlasPaths.some((atlasPath) => pathsOverlap(relativePath, atlasPath));
}

async function directoryContainsMarkdown(
  absoluteDir: string,
  relativeDir: string,
  atlasPaths: string[]
): Promise<boolean> {
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) return true;
    if (!entry.isDirectory()) continue;

    const childRelative = toPosixPath(path.join(relativeDir, entry.name));
    if (isExcludedSourcePath(childRelative, atlasPaths)) continue;
    if (await directoryContainsMarkdown(path.join(absoluteDir, entry.name), childRelative, atlasPaths)) return true;
  }

  return false;
}
