import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readCoveoConfig } from '../src/config.ts';
import { fetchIndexedItems } from './coveoIndex.ts';
import { buildIndexReport } from './indexQuality.ts';
import type { PokemonValues } from './pokemonPage.ts';

const JSON_INDENT = 2;
const EXIT_PASSED = 0;
const EXIT_FAILED = 1;
const REPORTS = new URL('./reports/', import.meta.url);

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as T;
}

async function main(): Promise<void> {
  const reference = await readJson<Record<string, PokemonValues>>('./reference/pokemon.json');
  const { itemCount } = await readJson<{ itemCount: number }>('./reference/hand-verified.json');
  const items = await fetchIndexedItems(readCoveoConfig(process.env));

  const report = buildIndexReport(items, reference, itemCount);

  await mkdir(REPORTS, { recursive: true });
  await writeFile(new URL('index-quality.json', REPORTS), `${JSON.stringify(report, null, JSON_INDENT)}\n`);
  console.log(JSON.stringify(report, null, JSON_INDENT));
  process.exitCode = report.passed ? EXIT_PASSED : EXIT_FAILED;
}

main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = EXIT_FAILED;
});
