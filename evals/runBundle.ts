import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { contributorsFor, sizeOf, summarizeAssets } from './bundle.ts';
import { runMain, writeEvalJson } from './runner.ts';

const run = promisify(execFile);
const ASSETS = 'assets';
const MAP_SUFFIX = '.map';
const TOP_CONTRIBUTORS = 10;
const PERCENT = 100;
const SHARE_DECIMALS = 1;
const TEMPLATE_QUOTE = '`';
const ESCAPE = '\\';
const TAILWIND_HEADER = `${TEMPLATE_QUOTE}/*! tailwindcss`;
const ASSET_REFERENCE = /(?:src|href)="\/(assets\/[^"]+)"/g;
const DECLARED_PROPERTY = /--[\w-]+(?=\s*:)/g;
const NOT_FOUND = -1;
const CAPTURED = 1;
const NONE = 0;
const THEME = new URL('../src/theme.css', import.meta.url);

function share(part: number, whole: number): number {
  return Number(((part / whole) * PERCENT).toFixed(SHARE_DECIMALS));
}

/** Every Tailwind stylesheet the bundle carries as a string. Atomic ships some; ours is the one that holds most of our theme tokens. */
function inlineStylesheets(code: string): string[] {
  const found: string[] = [];
  let start = code.indexOf(TAILWIND_HEADER);
  while (start !== NOT_FOUND) {
    let end = start + TEMPLATE_QUOTE.length;
    while (code[end] !== TEMPLATE_QUOTE || code[end - ESCAPE.length] === ESCAPE) {
      end += TEMPLATE_QUOTE.length;
    }
    found.push(code.slice(start, end + TEMPLATE_QUOTE.length));
    start = code.indexOf(TAILWIND_HEADER, end);
  }
  return found;
}

async function main(): Promise<void> {
  const outDir = await mkdtemp(join(tmpdir(), 'pokebowl-bundle-'));
  await run('npx', ['vite', 'build', '--sourcemap', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error']);
  const html = await readFile(join(outDir, 'index.html'), 'utf8');
  const initial = [...html.matchAll(ASSET_REFERENCE)].map((match) => match[CAPTURED]);
  const names = (await readdir(join(outDir, ASSETS))).filter((name) => /\.(js|css)$/.test(name));
  const files = await Promise.all(
    names.map(async (name) => ({ name: `${ASSETS}/${name}`, content: await readFile(join(outDir, ASSETS, name)) })),
  );
  const assets = await summarizeAssets(files, initial);
  const entry = files.find((file) => initial.includes(file.name) && file.name.endsWith('.js') && !file.name.includes('runtime'));
  if (!entry) {
    throw new Error('The build has no entry script.');
  }
  const code = entry.content.toString('utf8');
  const map = JSON.parse(await readFile(join(outDir, `${entry.name}${MAP_SUFFIX}`), 'utf8')) as { sources: string[]; mappings: string };
  const contributors = await contributorsFor({ code, ...map });
  const entrySize = await sizeOf(entry.content);
  const tokens = [...new Set((await readFile(THEME, 'utf8')).match(DECLARED_PROPERTY))];
  const sheets = inlineStylesheets(code).map((text) => ({ text, matches: tokens.filter((token) => text.includes(token)).length }));
  const mostMatches = Math.max(NONE, ...sheets.map((sheet) => sheet.matches));
  const cardText = sheets.find((sheet) => sheet.matches === mostMatches && mostMatches > NONE)?.text;
  const cardSheet = cardText ? await sizeOf(cardText) : undefined;
  const atomicSheets = sheets.filter((sheet) => sheet.text !== cardText);
  await rm(outDir, { recursive: true, force: true });

  await writeEvalJson('reports/bundle.json', {
    measuredAt: new Date().toISOString(),
    method: 'Production build with source maps. Gzip at level 9 per file. Contributors credit each stretch of minified entry code to its source module through the source map, then gzip each package on its own, so package gzip sizes do not add up exactly to the file size.',
    assets,
    entry: { name: entry.name, ...entrySize },
    contributors: contributors.slice(undefined, TOP_CONTRIBUTORS).map((item) => ({ ...item, gzipShare: share(item.gzipBytes, entrySize.gzip) })),
    cardStylesheet: cardSheet && { raw: cardSheet.raw, gzip: cardSheet.gzip, gzipShareOfEntry: share(cardSheet.gzip, entrySize.gzip) },
    atomicStylesheets: { count: atomicSheets.length, ...(await sizeOf(atomicSheets.map((sheet) => sheet.text).join(''))) },
  });
  console.log('Wrote evals/reports/bundle.json');
}

runMain(main);
