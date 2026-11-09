import { expect, it } from 'vitest';
import { contributorsFor, decodeMappings, packageOf, summarizeAssets } from './bundle.ts';

const FIRST_SOURCE_BYTES = 5;
const ENTRY_BYTES = 1000;
const LAZY_BYTES = 100;
const CSS_BYTES = 10;

it('groups module paths by package', (): void => {
  expect(packageOf('../node_modules/react-dom/cjs/x.js')).toBe('react-dom');
  expect(packageOf('../node_modules/@coveo/headless/dist/a.js')).toBe('@coveo/headless');
  expect(packageOf('../../src/App.tsx')).toBe('application');
});

it('uses the innermost package when node_modules is nested', (): void => {
  expect(packageOf('node_modules/a/node_modules/b/x.js')).toBe('b');
});

it('decodes generated columns and source indexes from a source map', (): void => {
  // AAAA: column 0, source 0. KCAA: column +5, source +1. A new line resets the column only.
  expect(decodeMappings('AAAA,KCAA;AAAA')).toEqual([
    [
      { column: 0, source: 0 },
      { column: FIRST_SOURCE_BYTES, source: 1 },
    ],
    [{ column: 0, source: 1 }],
  ]);
});

it('credits generated code to the source that produced it', async (): Promise<void> => {
  const first = 'a'.repeat(FIRST_SOURCE_BYTES);
  const contributors = await contributorsFor({
    code: `${first}bbb\ncc`,
    sources: ['node_modules/one/a.js', 'src/b.ts'],
    mappings: 'AAAA,KCAA;AAAA',
  });

  expect(contributors.find((entry) => entry.name === 'one')?.rawBytes).toBe(first.length);
  expect(contributors.find((entry) => entry.name === 'application')?.rawBytes).toBe('bbb\ncc'.length);
});

it('reports raw and gzipped sizes and splits initial from lazy assets', async (): Promise<void> => {
  const summary = await summarizeAssets(
    [
      { name: 'assets/index.js', content: Buffer.from('a'.repeat(ENTRY_BYTES)) },
      { name: 'assets/lazy.js', content: Buffer.from('b'.repeat(LAZY_BYTES)) },
      { name: 'assets/index.css', content: Buffer.from('c'.repeat(CSS_BYTES)) },
    ],
    ['assets/index.js', 'assets/index.css'],
  );

  expect(summary.js.raw).toBe(ENTRY_BYTES + LAZY_BYTES);
  expect(summary.css.raw).toBe(CSS_BYTES);
  expect(summary.initial.raw).toBe(ENTRY_BYTES + CSS_BYTES);
  expect(summary.lazy).toEqual({ count: 1, raw: LAZY_BYTES, gzip: expect.any(Number) });
  expect(summary.js.gzip).toBeLessThan(summary.js.raw);
});
