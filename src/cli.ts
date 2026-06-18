#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture } from './capture.js';
import { formatDoctorReport, runDoctor } from './doctor.js';
import { formatInitResult, initWren } from './init.js';
import { formatLintReport, runLint } from './lint.js';

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
  lint                 Check Wren content health

Options:
  capture --title, -t  Optional capture title
  capture --tag       Optional tag, repeatable
  capture --stdin     Read capture body from stdin
`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
