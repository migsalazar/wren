import path from 'node:path';
import { readText } from './files.js';
import { IndexedDocument, readSearchIndex } from './search-index.js';
import { extractTags, normalizeText, tokenize, uniqueTokens } from './search-text.js';

export {
  buildAndWriteSearchIndex,
  buildSearchIndex,
  getSearchIndexStatus,
  SEARCH_INDEX_PATH,
  writeSearchIndex
} from './search-index.js';
export type { IndexReport, SearchIndexStatus } from './search-index.js';

export type SearchArea = 'atlas' | 'sources' | 'all';

export interface SearchOptions {
  query: string;
  area?: SearchArea;
  limit?: number;
}

export interface SearchSnippet {
  line: number;
  text: string;
}

export interface SearchResult {
  path: string;
  area: 'atlas' | 'source';
  score: number;
  matched: string[];
  snippet?: SearchSnippet;
}

export interface SearchReport {
  query: string;
  area: SearchArea;
  searchedFiles: number;
  results: SearchResult[];
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export async function runSearch(rootDir: string, options: SearchOptions): Promise<SearchReport> {
  const query = options.query.trim();
  if (!query) throw new Error('search query must not be empty.');

  const area = options.area ?? 'all';
  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1) throw new Error('search --limit must be a positive integer.');

  const index = await readSearchIndex(rootDir);
  const documents = index.documents.filter((document) => matchesArea(document, area));
  const scored = scoreDocuments(documents, query);
  await applyPhraseBoosts(rootDir, scored, query, limit);
  applySharedTagBoosts(scored, limit);

  const results = scored
    .filter((result) => result.score > 0)
    .sort(compareScoredResults)
    .slice(0, limit);

  await attachSnippets(rootDir, results, query);

  return {
    query,
    area,
    searchedFiles: documents.length,
    results: results.map((result) => ({
      path: result.document.path,
      area: result.document.area,
      score: roundScore(result.score),
      matched: [...result.reasons].sort(),
      snippet: result.snippet
    }))
  };
}

export function formatIndexReport(report: { documentCount: number; atlasCount: number; sourceCount: number; warnings: string[]; indexPath: string }): string {
  const lines = ['Wren index', ''];

  lines.push(`✓ indexed ${report.documentCount} Markdown file${plural(report.documentCount)}`);
  lines.push(`  atlas: ${report.atlasCount}`);
  lines.push(`  sources: ${report.sourceCount}`);

  for (const warning of report.warnings) lines.push(`! ${warning}`);

  lines.push(`Index: ${report.indexPath}`);
  return lines.join('\n');
}

export function formatSearchReport(report: SearchReport): string {
  const lines = ['Wren search', ''];

  lines.push(`Query: ${report.query}`);
  lines.push(`Area: ${report.area}`);
  lines.push(`✓ searched ${report.searchedFiles} indexed Markdown file${plural(report.searchedFiles)}`);
  lines.push('');

  if (report.results.length === 0) {
    lines.push('No matches.');
    return lines.join('\n');
  }

  for (const [index, result] of report.results.entries()) {
    lines.push(`${index + 1}. ${result.path}`);
    lines.push(`   score: ${result.score.toFixed(2)}`);
    lines.push(`   matched: ${result.matched.join(', ')}`);
    if (result.snippet) lines.push(`   ${result.snippet.line}: ${result.snippet.text}`);
    lines.push('');
  }

  lines.push(`Result: ${report.results.length} ${matchNoun(report.results.length)}`);
  return lines.join('\n');
}

interface ScoredDocument {
  document: IndexedDocument;
  score: number;
  reasons: Set<string>;
  snippet?: SearchSnippet;
}

function scoreDocuments(documents: IndexedDocument[], query: string): ScoredDocument[] {
  const queryTokens = uniqueTokens(tokenize(query));
  const queryTags = extractTags(query);
  const phrase = normalizeText(query);
  const averageLength = average(documents.map((document) => document.tokenCount));
  const documentFrequencies = buildDocumentFrequencies(documents, queryTokens);

  return documents.map((document) => {
    const result: ScoredDocument = { document, score: 0, reasons: new Set<string>() };
    const bm25Score = scoreBm25(document, documents.length, documentFrequencies, queryTokens, averageLength);
    if (bm25Score > 0) {
      result.score += bm25Score;
      result.reasons.add('bm25');
    }

    applyFieldBoosts(result, queryTokens, queryTags, phrase);
    return result;
  });
}

function buildDocumentFrequencies(documents: IndexedDocument[], queryTokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const token of queryTokens) {
    frequencies.set(token, documents.filter((document) => (document.terms[token] ?? 0) > 0).length);
  }

  return frequencies;
}

function scoreBm25(
  document: IndexedDocument,
  documentCount: number,
  documentFrequencies: Map<string, number>,
  queryTokens: string[],
  averageLength: number
): number {
  if (queryTokens.length === 0 || document.tokenCount === 0 || averageLength === 0) return 0;

  let score = 0;
  for (const token of queryTokens) {
    const termFrequency = document.terms[token] ?? 0;
    if (termFrequency === 0) continue;

    const documentFrequency = documentFrequencies.get(token) ?? 0;
    const idf = Math.log(1 + (documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
    const denominator = termFrequency + BM25_K1 * (1 - BM25_B + BM25_B * (document.tokenCount / averageLength));
    score += idf * ((termFrequency * (BM25_K1 + 1)) / denominator);
  }

  return score;
}

function applyFieldBoosts(
  result: ScoredDocument,
  queryTokens: string[],
  queryTags: string[],
  phrase: string
): void {
  const title = normalizeText(result.document.title);
  const headings = result.document.headings.map((heading) => normalizeText(heading));
  const tags = result.document.tags;

  if (phrase && title.includes(phrase)) addBoost(result, 7, 'title phrase');
  if (phrase && headings.some((heading) => heading.includes(phrase))) addBoost(result, 5, 'heading phrase');
  if (phrase && tags.some((tag) => tag.includes(phrase))) addBoost(result, 4, 'tag phrase');

  for (const token of queryTokens) {
    if (titleTokens(result.document).includes(token)) addBoost(result, 3, 'title');
    if (headingTokens(result.document).includes(token)) addBoost(result, 2, 'heading');
    if (tagTokens(result.document).includes(token)) addBoost(result, 4, 'tag');
  }

  for (const tag of queryTags) {
    if (tags.includes(tag)) addBoost(result, 6, `tag #${tag}`);
  }
}

async function applyPhraseBoosts(
  rootDir: string,
  scored: ScoredDocument[],
  query: string,
  limit: number
): Promise<void> {
  const phrase = normalizeText(query);
  if (!phrase || phrase.split(' ').length < 2) return;

  const candidates = scored
    .filter((result) => result.score > 0)
    .sort(compareScoredResults)
    .slice(0, Math.max(50, limit * 5));

  for (const result of candidates) {
    try {
      const content = await readText(path.join(rootDir, result.document.path));
      if (normalizeText(content).includes(phrase)) addBoost(result, 4, 'phrase');
    } catch {
      // Stale indexes are reported by doctor; search should still return remaining matches.
    }
  }
}

function applySharedTagBoosts(scored: ScoredDocument[], limit: number): void {
  const directMatches = scored
    .filter((result) => result.score > 0)
    .sort(compareScoredResults)
    .slice(0, Math.max(limit, 10));
  const seedTags = new Set(directMatches.flatMap((result) => result.document.tags));
  if (seedTags.size === 0) return;

  for (const result of scored) {
    if (result.score > 0) continue;

    const sharedTags = result.document.tags.filter((tag) => seedTags.has(tag));
    if (sharedTags.length === 0) continue;

    result.score += 1.5 * sharedTags.length;
    for (const tag of sharedTags) result.reasons.add(`shared tag #${tag}`);
  }
}

async function attachSnippets(rootDir: string, results: ScoredDocument[], query: string): Promise<void> {
  const queryTokens = uniqueTokens(tokenize(query));
  const phrase = normalizeText(query);

  for (const result of results) {
    try {
      const content = await readText(path.join(rootDir, result.document.path));
      result.snippet = findSnippet(content, queryTokens, phrase);
    } catch {
      result.snippet = undefined;
    }
  }
}

function findSnippet(content: string, queryTokens: string[], phrase: string): SearchSnippet | undefined {
  const lines = content.split(/\r?\n/);
  const fallback = firstMeaningfulLine(lines);

  if (phrase) {
    const phraseMatch = lines.findIndex((line) => normalizeText(line).includes(phrase));
    if (phraseMatch >= 0) return { line: phraseMatch + 1, text: trimSnippet(lines[phraseMatch]) };
  }

  const scoredLines = lines
    .map((line, index) => ({ line, index, score: scoreSnippetLine(line, queryTokens) }))
    .filter((candidate) => candidate.score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index);

  if (scoredLines[0]) return { line: scoredLines[0].index + 1, text: trimSnippet(scoredLines[0].line) };

  return fallback;
}

function scoreSnippetLine(line: string, queryTokens: string[]): number {
  const lineTokens = new Set(tokenize(line));
  let score = queryTokens.filter((token) => lineTokens.has(token)).length;
  if (/^\s*#/.test(line)) score -= 0.25;
  return score;
}

function firstMeaningfulLine(lines: string[]): SearchSnippet | undefined {
  const index = lines.findIndex((line) => line.trim().length > 0);
  if (index < 0) return undefined;
  return { line: index + 1, text: trimSnippet(lines[index]) };
}

function trimSnippet(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 177)}...`;
}

function matchesArea(document: IndexedDocument, area: SearchArea): boolean {
  if (area === 'all') return true;
  if (area === 'atlas') return document.area === 'atlas';
  return document.area === 'source';
}

function addBoost(result: ScoredDocument, boost: number, reason: string): void {
  result.score += boost;
  result.reasons.add(reason);
}

function compareScoredResults(first: ScoredDocument, second: ScoredDocument): number {
  return second.score - first.score || first.document.path.localeCompare(second.document.path);
}

function titleTokens(document: IndexedDocument): string[] {
  return uniqueTokens(tokenize(document.title));
}

function headingTokens(document: IndexedDocument): string[] {
  return uniqueTokens(tokenize(document.headings.join('\n')));
}

function tagTokens(document: IndexedDocument): string[] {
  return uniqueTokens(document.tags.flatMap((tag) => tokenize(tag.replace(/\//g, ' ')).concat(tag)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}

function matchNoun(count: number): string {
  return count === 1 ? 'match' : 'matches';
}
