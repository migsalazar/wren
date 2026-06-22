import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const WREN_CACHE_PATH = path.join('.wren', 'cache');
export const WREN_CACHE_GITIGNORE_PATH = path.join(WREN_CACHE_PATH, '.gitignore');
export const WREN_CACHE_GITIGNORE_CONTENT = '*\n!.gitignore\n';

export async function ensureWrenCache(rootDir: string): Promise<void> {
  await mkdir(path.join(rootDir, WREN_CACHE_PATH), { recursive: true });
  await writeFile(path.join(rootDir, WREN_CACHE_GITIGNORE_PATH), WREN_CACHE_GITIGNORE_CONTENT, 'utf8');
}
