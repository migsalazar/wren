import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureWrenCache, WREN_CACHE_PATH } from './cache.js';

export type MetricEvent = 'recall' | 'reflect' | 'capture' | 'search';
export type MetricArea = 'wiki' | 'sources' | 'all';

export interface MetricOptions {
  event: MetricEvent;
  query?: string;
  filesRead?: string[];
  filesWritten?: string[];
  area?: MetricArea;
}

export interface MetricCliInput {
  stdin?: string;
  event?: string;
  query?: string;
  filesRead?: string[];
  filesWritten?: string[];
  area?: string;
}

interface MetricLine {
  ts: string;
  event: MetricEvent;
  query?: string;
  filesRead?: string[];
  filesWritten?: string[];
  area?: MetricArea;
}

const METRIC_EVENTS: MetricEvent[] = ['recall', 'reflect', 'capture', 'search'];
const METRIC_AREAS: MetricArea[] = ['wiki', 'sources', 'all'];

export const METRICS_PATH = path.join(WREN_CACHE_PATH, 'metrics.jsonl');

export async function appendMetric(rootDir: string, options: MetricOptions): Promise<string> {
  const line = buildMetricLine(options);
  await ensureWrenCache(rootDir);
  await appendFile(path.join(rootDir, METRICS_PATH), `${JSON.stringify(line)}\n`, 'utf8');
  return METRICS_PATH;
}

export function resolveMetricInput(input: MetricCliInput): MetricOptions {
  if (input.stdin !== undefined) return metricOptionsFromJson(input.stdin);

  return normalizeMetricOptions({
    event: input.event,
    query: input.query,
    filesRead: input.filesRead ?? [],
    filesWritten: input.filesWritten ?? [],
    area: input.area
  });
}

function metricOptionsFromJson(input: string): MetricOptions {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(`metric --stdin requires a JSON object: ${(error as Error).message}`);
  }

  if (!isRecord(parsed)) throw new Error('metric --stdin requires a JSON object.');

  return normalizeMetricOptions({
    event: parsed.event,
    query: parsed.query,
    filesRead: parsed.filesRead,
    filesWritten: parsed.filesWritten,
    area: parsed.area
  });
}

function buildMetricLine(options: MetricOptions): MetricLine {
  const normalized = normalizeMetricOptions(options);
  const line: MetricLine = {
    ts: new Date().toISOString(),
    event: normalized.event
  };

  if (normalized.query) line.query = normalized.query;
  if (normalized.filesRead && normalized.filesRead.length > 0) line.filesRead = normalized.filesRead;
  if (normalized.filesWritten && normalized.filesWritten.length > 0) line.filesWritten = normalized.filesWritten;
  if (normalized.area) line.area = normalized.area;

  return line;
}

function normalizeMetricOptions(value: {
  event: unknown;
  query?: unknown;
  filesRead?: unknown;
  filesWritten?: unknown;
  area?: unknown;
}): MetricOptions {
  return {
    event: parseMetricEvent(value.event),
    query: optionalString(value.query, 'query'),
    filesRead: optionalStringArray(value.filesRead, 'filesRead'),
    filesWritten: optionalStringArray(value.filesWritten, 'filesWritten'),
    area: optionalMetricArea(value.area)
  };
}

function parseMetricEvent(value: unknown): MetricEvent {
  if (typeof value !== 'string' || value.length === 0) throw new Error('--event is required.');
  if (isMetricEvent(value)) return value;
  throw new Error(`--event must be one of: ${METRIC_EVENTS.join(', ')}.`);
}

function optionalMetricArea(value: unknown): MetricArea | undefined {
  const area = optionalString(value, 'area');
  if (!area) return undefined;
  if (isMetricArea(area)) return area;
  throw new Error(`--area must be one of: ${METRIC_AREAS.join(', ')}.`);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of strings.`);

  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') throw new Error(`${field} must be an array of strings.`);
    const trimmed = item.trim();
    if (trimmed.length > 0) values.push(trimmed);
  }

  return values.length > 0 ? values : undefined;
}

function isMetricEvent(value: string): value is MetricEvent {
  return METRIC_EVENTS.includes(value as MetricEvent);
}

function isMetricArea(value: string): value is MetricArea {
  return METRIC_AREAS.includes(value as MetricArea);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
