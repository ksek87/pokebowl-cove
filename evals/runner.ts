import { mkdir, readFile, writeFile } from 'node:fs/promises';

const JSON_INDENT = 2;
const EXIT_FAILED = 1;
const ROOT = new URL('./', import.meta.url);

export async function readEvalJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, ROOT), 'utf8')) as T;
}

export async function writeEvalJson(path: string, value: unknown): Promise<void> {
  const target = new URL(path, ROOT);
  await mkdir(new URL('./', target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, JSON_INDENT)}\n`);
}

export function pause(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}

export function runMain(main: () => Promise<void>): void {
  main().catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = EXIT_FAILED;
  });
}
