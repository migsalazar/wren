import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathExists, readText, toPosixPath } from './files.js';

export const LEARNING_CANDIDATES_DIR = path.join('.wren', 'cache', 'learning', 'candidates');

export interface LearningCandidate {
  id: string;
  status: 'candidate';
  scope: 'vault';
  domain: string;
  confidence: number;
  created: string;
  trigger: string;
  evidence: string[];
  suggestedTargets: string[];
  title: string;
}

export interface LearningCandidateRecord {
  id: string;
  relativePath: string;
  absolutePath: string;
  content: string;
  candidate?: LearningCandidate;
  issues: string[];
}

interface ParsedFrontmatter {
  values: Map<string, string | string[]>;
  body: string;
}

const CANDIDATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function listLearningCandidates(rootDir: string): Promise<LearningCandidateRecord[]> {
  const candidatesDir = path.join(rootDir, LEARNING_CANDIDATES_DIR);
  if (!(await pathExists(candidatesDir))) return [];

  const stats = await stat(candidatesDir);
  if (!stats.isDirectory()) {
    return [invalidDirectoryRecord(rootDir, candidatesDir)];
  }

  const entries = await readdir(candidatesDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .sort((left, right) => left.name.localeCompare(right.name));

  const records: LearningCandidateRecord[] = [];
  for (const file of files) {
    const absolutePath = path.join(candidatesDir, file.name);
    const content = await readText(absolutePath);
    records.push(parseLearningCandidateFile(rootDir, absolutePath, content));
  }

  return records;
}

export async function readLearningCandidate(rootDir: string, id: string): Promise<LearningCandidateRecord> {
  const candidateRef = validateCandidateReference(id);
  const absolutePath = path.join(rootDir, LEARNING_CANDIDATES_DIR, `${candidateRef}.md`);

  if (!(await pathExists(absolutePath))) {
    throw new Error(`Learning candidate not found: ${candidateRef}`);
  }

  return parseLearningCandidateFile(rootDir, absolutePath, await readText(absolutePath));
}

export async function dropLearningCandidate(rootDir: string, id: string): Promise<string> {
  const record = await readLearningCandidate(rootDir, id);
  await rm(record.absolutePath, { force: true });
  return record.relativePath;
}

export function formatLearningCandidateList(records: LearningCandidateRecord[]): string {
  const lines = ['Wren learning candidates', ''];

  if (records.length === 0) {
    lines.push('No pending learning candidates.');
    return lines.join('\n');
  }

  for (const record of records) {
    const status = record.issues.length === 0 ? 'valid' : 'invalid';
    const candidate = record.candidate;
    const summary = record.issues.length > 0
      ? record.issues.join('; ')
      : candidate
        ? `${candidate.domain}; confidence ${candidate.confidence.toFixed(2)}; target ${candidate.suggestedTargets.join(', ')}`
        : 'unparseable candidate';
    lines.push(`- ${record.id} [${status}] ${summary}`);
  }

  lines.push('');
  lines.push('Use `wren learn show <id>` to inspect, or `wren learn drop <id>` to remove a candidate.');
  return lines.join('\n');
}

export function formatLearningCandidateShow(record: LearningCandidateRecord): string {
  if (record.issues.length === 0) return record.content;

  return [
    `Learning candidate validation warnings for ${record.relativePath}:`,
    ...record.issues.map((issue) => `- ${issue}`),
    '',
    record.content
  ].join('\n');
}

export function parseLearningCandidateFile(
  rootDir: string,
  absolutePath: string,
  content: string
): LearningCandidateRecord {
  const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
  const fileId = path.basename(absolutePath, path.extname(absolutePath));
  const issues: string[] = [];
  let parsed: ParsedFrontmatter | undefined;

  try {
    parsed = parseFrontmatter(content);
  } catch (error) {
    issues.push((error as Error).message);
  }

  const candidate = parsed ? candidateFromFrontmatter(parsed, fileId, issues) : undefined;
  return {
    id: fileId,
    relativePath,
    absolutePath,
    content,
    candidate,
    issues
  };
}

function candidateFromFrontmatter(
  parsed: ParsedFrontmatter,
  fileId: string,
  issues: string[]
): LearningCandidate | undefined {
  const id = readRequiredString(parsed.values, 'id', issues);
  const status = readRequiredString(parsed.values, 'status', issues);
  const scope = readRequiredString(parsed.values, 'scope', issues);
  const domain = readRequiredString(parsed.values, 'domain', issues);
  const confidence = readRequiredNumber(parsed.values, 'confidence', issues);
  const created = readRequiredString(parsed.values, 'created', issues);
  const trigger = readRequiredString(parsed.values, 'trigger', issues);
  const evidence = readRequiredStringArray(parsed.values, 'evidence', issues);
  const suggestedTargets = readRequiredStringArray(parsed.values, 'suggested_targets', issues);
  const title = extractTitle(parsed.body) ?? id ?? fileId;

  if (id && !CANDIDATE_ID_PATTERN.test(id)) issues.push('id must be a kebab-case slug.');
  if (id && id !== fileId) issues.push(`id must match filename: expected ${fileId}.`);
  if (status && status !== 'candidate') issues.push('status must be candidate.');
  if (scope && scope !== 'vault') issues.push('scope must be vault.');
  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    issues.push('confidence must be between 0 and 1.');
  }

  for (const target of suggestedTargets ?? []) {
    if (!isAllowedSuggestedTarget(target)) {
      issues.push(`suggested target is not a Wren instruction surface: ${target}`);
    }
  }

  if (!id || status !== 'candidate' || scope !== 'vault' || !domain || confidence === undefined || !created || !trigger) {
    return undefined;
  }

  return {
    id,
    status: 'candidate',
    scope: 'vault',
    domain,
    confidence,
    created,
    trigger,
    evidence: evidence ?? [],
    suggestedTargets: suggestedTargets ?? [],
    title
  };
}

function parseFrontmatter(content: string): ParsedFrontmatter {
  const normalized = content.replace(/^\uFEFF/, '');
  const openingMatch = normalized.match(/^---\r?\n/);
  if (!openingMatch) {
    throw new Error('candidate must start with YAML frontmatter.');
  }

  const frontmatterStart = openingMatch[0].length;
  const closingIndex = normalized.indexOf('\n---', frontmatterStart);
  if (closingIndex === -1) {
    throw new Error('candidate frontmatter is not closed.');
  }

  const frontmatter = normalized.slice(frontmatterStart, closingIndex);
  const body = normalized.slice(closingIndex + 4).replace(/^\r?\n/, '');
  return { values: parseFrontmatterLines(frontmatter), body };
}

function parseFrontmatterLines(frontmatter: string): Map<string, string | string[]> {
  const values = new Map<string, string | string[]>();
  const lines = frontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s/.test(line)) throw new Error(`unsupported frontmatter indentation near: ${line.trim()}`);

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) throw new Error(`invalid frontmatter line: ${line}`);

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) throw new Error(`invalid frontmatter key: ${line}`);

    if (rawValue.length > 0) {
      values.set(key, stripYamlQuotes(rawValue));
      continue;
    }

    const listValues: string[] = [];
    while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      index += 1;
      listValues.push(stripYamlQuotes(lines[index].replace(/^\s+-\s+/, '').trim()));
    }
    values.set(key, listValues);
  }

  return values;
}

function readRequiredString(values: Map<string, string | string[]>, key: string, issues: string[]): string | undefined {
  const value = values.get(key);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  issues.push(`${key} is required.`);
  return undefined;
}

function readRequiredNumber(values: Map<string, string | string[]>, key: string, issues: string[]): number | undefined {
  const value = readRequiredString(values, key, issues);
  if (!value) return undefined;
  if (!/^(?:0(?:\.\d+)?|\.\d+|1(?:\.0+)?)$/.test(value)) {
    issues.push(`${key} must be a number.`);
    return undefined;
  }
  return Number.parseFloat(value);
}

function readRequiredStringArray(
  values: Map<string, string | string[]>,
  key: string,
  issues: string[]
): string[] | undefined {
  const value = values.get(key);
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${key} must be a non-empty list.`);
    return undefined;
  }

  const trimmed = value.map((item) => item.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    issues.push(`${key} must be a non-empty list.`);
    return undefined;
  }
  return trimmed;
}

function isAllowedSuggestedTarget(target: string): boolean {
  const normalized = target.split(path.sep).join('/');
  if (normalized === 'AGENTS.md') return true;
  if (/^\.wren\/workflows\/[A-Za-z0-9._-]+\.md$/.test(normalized)) return true;
  if (/^\.wren\/templates\/[A-Za-z0-9._-]+\.md$/.test(normalized)) return true;
  if (/^\.wren\/learning\/[A-Za-z0-9._/-]+\.md$/.test(normalized)) return !normalized.includes('/../');
  return false;
}

function validateCandidateReference(candidateRef: string): string {
  const trimmed = candidateRef.trim();
  if (!trimmed) throw new Error('Learning candidate id must not be empty.');
  if (/[\\/\0\r\n]/.test(trimmed)) {
    throw new Error('Learning candidate id must be a direct candidate filename stem.');
  }
  return trimmed;
}

function stripYamlQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function extractTitle(body: string): string | undefined {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

function invalidDirectoryRecord(rootDir: string, absolutePath: string): LearningCandidateRecord {
  return {
    id: 'candidates-directory',
    relativePath: toPosixPath(path.relative(rootDir, absolutePath)),
    absolutePath,
    content: '',
    issues: ['learning candidates path exists but is not a directory.']
  };
}
