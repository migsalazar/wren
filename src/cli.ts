#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture } from './capture.js';
import { loadConfig } from './config.js';
import { formatDoctorReport, runDoctor } from './doctor.js';
import { formatInitResult, initWren } from './init.js';
import { formatLintReport, runLint } from './lint.js';
import { buildAndWriteSearchIndex, formatIndexReport, formatSearchReport, runSearch, SearchArea } from './search.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = process.cwd();

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'init') {
    const result = await initWren(rootDir, packageRoot);
    console.log(formatInitResult(result));
    return;
  }

  if (command === 'capture') {
    const title = readOption(args, '--title') ?? readOption(args, '-t');
    const tags = readOptions(args, '--tag');
    const body = hasOption(args, '--stdin') ? await readStdin() : undefined;
    const createdPath = await capture(rootDir, { title, tags, body });
    console.log(`Created capture: ${createdPath}`);
    return;
  }

  if (command === 'doctor') {
    const report = await runDoctor(rootDir);
    console.log(formatDoctorReport(report));
    if (report.errors > 0) process.exitCode = 1;
    return;
  }

  if (command === 'index') {
    const config = await loadConfig(rootDir);
    const report = await buildAndWriteSearchIndex(rootDir, config);
    console.log(formatIndexReport(report));
    return;
  }

  if (command === 'search') {
    const query = readPositionals(args).join(' ');
    const area = parseSearchArea(readOption(args, '--area'));
    const limit = parsePositiveInteger(readOption(args, '--limit') ?? readOption(args, '-n') ?? '10', '--limit');
    const report = await runSearch(rootDir, { query, area, limit });
    console.log(hasOption(args, '--json') ? JSON.stringify(report, null, 2) : formatSearchReport(report));
    return;
  }

  if (command === 'lint') {
    const report = await runLint(rootDir);
    console.log(formatLintReport(report));
    if (report.errors > 0) process.exitCode = 1;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function readOption(args: string[], name: string): string | undefined {
  return readOptions(args, name)[0];
}

function readOptions(args: string[], name: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${name} requires a value.`);
    values.push(value);
  }

  return values;
}

function hasOption(args: string[], name: string): boolean {
  return args.includes(name);
}

function readPositionals(args: string[]): string[] {
  const values: string[] = [];
  const optionsWithValues = new Set(['--area', '--limit', '-n']);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('-')) {
      if (optionsWithValues.has(arg)) index += 1;
      continue;
    }
    values.push(arg);
  }

  return values;
}

function parseSearchArea(value: string | undefined): SearchArea {
  if (!value) return 'all';
  if (value === 'wiki' || value === 'sources' || value === 'all') return value;
  throw new Error('--area must be one of: wiki, sources, all.');
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding('utf8');

  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input;
}

function printHelp(): void {
  console.log(`Usage: wren <command> [options]

Commands:
  init                 Create Wren scaffold files if missing
  capture              Create a capture note from the template
  doctor               Diagnose Wren vault setup
  index                Build the local BM25 search index
  search <query>       Search the local BM25 index
  lint                 Check Wren content health

Options:
  capture --title, -t  Optional capture title
  capture --tag        Optional tag, repeatable
  capture --stdin      Read capture body from stdin
  search --area        wiki, sources, or all (default: all)
  search --limit, -n   Maximum results (default: 10)
  search --json        Print JSON output
`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
