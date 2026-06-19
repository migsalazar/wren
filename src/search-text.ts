export interface MarkdownHeading {
  level: number;
  text: string;
}

export function extractHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const pattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    headings.push({ level: match[1].length, text: match[2].trim() });
  }

  return headings;
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const pattern = /(^|[\s([{])#([\p{L}\p{N}][\p{L}\p{N}/_-]*)/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    tags.add(normalizeTag(match[2]));
  }

  return [...tags].sort();
}

export function countTerms(tokens: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const token of tokens) counts[token] = (counts[token] ?? 0) + 1;
  return counts;
}

export function tokenize(value: string): string[] {
  const matches = normalizeText(value).match(/[\p{L}\p{N}]+/gu);
  return matches ?? [];
}

export function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}#/]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeTag(value: string): string {
  return value
    .trim()
    .replace(/^#+/, '')
    .split('/')
    .map((segment) => normalizeText(segment).replace(/\s+/g, '-'))
    .filter((segment) => segment.length > 0)
    .join('/');
}
