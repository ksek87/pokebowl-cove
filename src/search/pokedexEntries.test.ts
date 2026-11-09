import { expect, it } from 'vitest';
import { parsePokedexEntries } from './pokedexEntries.ts';

const SECTION = '<h2>Pokédex entries</h2>';

function row(games: string[], text: string): string {
  const labels = games.map((game) => `<span class="igame">${game}</span>`).join('<br/>');
  return `<tr><th>${labels}</th><td class="cell-med-text">${text}</td></tr>`;
}

function table(...rows: string[]): string {
  return `<div class="resp-scroll"><table><tbody>${rows.join('')}</tbody></table></div>`;
}

function page(...parts: string[]): string {
  return `<html><body><h2>Base stats</h2>${table(row(['Stat'], 'Not an entry.'))}${parts.join('')}<h2>Where to find</h2>${table(row(['Later'], 'Not an entry either.'))}</body></html>`;
}

it('leads with the most recent entry of the base form', (): void => {
  const html = page(SECTION, '<h3>Testmon</h3>', table(row(['Red', 'Blue'], 'Old text.'), row(['Scarlet'], 'New text.')));

  expect(parsePokedexEntries(html)?.lead).toEqual({ text: 'New text.', games: ['Scarlet'] });
});

it('lists the remaining entries, newest first', (): void => {
  const html = page(SECTION, '<h3>Testmon</h3>', table(row(['A'], 'First.'), row(['B'], 'Second.'), row(['C'], 'Third.')));

  expect(parsePokedexEntries(html)?.more.map(({ text }) => text)).toEqual(['Second.', 'First.']);
});

it('merges repeated text and keeps every game that shares it', (): void => {
  const html = page(SECTION, '<h3>Testmon</h3>', table(row(['A'], 'Same.'), row(['B'], 'Other.'), row(['C'], 'Same.')));
  const entries = parsePokedexEntries(html);

  expect(entries?.lead.text).toBe('Same.');
  expect([...(entries?.lead.games ?? [])].sort()).toEqual(['A', 'C']);
  expect(entries?.more).toEqual([{ text: 'Other.', games: ['B'] }]);
});

it('treats text differing only in spacing as the same entry', (): void => {
  const html = page(SECTION, '<h3>Testmon</h3>', table(row(['A'], 'Same  text.'), row(['B'], ' Same text. ')));

  expect(parsePokedexEntries(html)?.more).toEqual([]);
});

it('groups alternate forms separately from the base form', (): void => {
  const html = page(
    SECTION,
    '<h3>Testmon</h3>',
    table(row(['A'], 'Base.')),
    '<h3>Mega Testmon</h3>',
    table(row(['X'], 'Mega text.')),
  );
  const entries = parsePokedexEntries(html);

  expect(entries?.lead.text).toBe('Base.');
  expect(entries?.forms).toEqual([{ form: 'Mega Testmon', entries: [{ text: 'Mega text.', games: ['X'] }] }]);
});

it('drops a form whose text only repeats the base form', (): void => {
  const html = page(SECTION, '<h3>Testmon</h3>', table(row(['A'], 'Base.')), '<h3>Cap</h3>', table(row(['B'], 'Base.')));

  expect(parsePokedexEntries(html)?.forms).toEqual([]);
});

it('reads entries with no form heading as the base form', (): void => {
  expect(parsePokedexEntries(page(SECTION, table(row(['A'], 'Base.'))))?.lead.text).toBe('Base.');
});

it('ignores tables outside the section', (): void => {
  const entries = parsePokedexEntries(page(SECTION, '<h3>Testmon</h3>', table(row(['A'], 'Only.'))));

  expect(entries?.more).toEqual([]);
  expect(entries?.lead.text).toBe('Only.');
});

it.each([
  ['an empty page', ''],
  ['a page with no entries section', page()],
  ['a section with no rows', page(SECTION, '<h3>Testmon</h3>')],
  ['rows missing their text', page(SECTION, '<table><tr><th><span class="igame">A</span></th></tr></table>')],
  ['rows missing their games', page(SECTION, '<table><tr><th></th><td class="cell-med-text">Text.</td></tr></table>')],
  ['malformed markup', '<h2>Pokédex entries<table><tr><td class="cell-med-text"'],
])('returns nothing for %s', (_name, html): void => {
  expect(parsePokedexEntries(html)).toBeNull();
});
