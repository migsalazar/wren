import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

export async function writeNewText(filePath: string, content: string): Promise<'created' | 'skipped'> {
  if (await pathExists(filePath)) return 'skipped';
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return 'created';
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
