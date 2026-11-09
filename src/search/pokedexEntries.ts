const SECTION_HEADING = 'Pokédex entries';
const STRUCTURE_SELECTOR = 'h2, h3, tr';
const ENTRY_TEXT_SELECTOR = 'td.cell-med-text';
const GAME_LABEL_SELECTOR = '.igame';

export interface PokedexEntry {
  text: string;
  games: string[];
}

export interface PokedexForm {
  form: string;
  entries: PokedexEntry[];
}

export interface PokedexEntries {
  lead: PokedexEntry;
  more: PokedexEntry[];
  forms: PokedexForm[];
}

interface FormRows {
  form: string;
  rows: PokedexEntry[];
}

function readText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function readRow(row: Element): PokedexEntry | null {
  const text = readText(row.querySelector(ENTRY_TEXT_SELECTOR));
  const games = [...row.querySelectorAll(GAME_LABEL_SELECTOR)].map(readText).filter(Boolean);
  return text && games.length ? { text, games } : null;
}

/** Reads only the rows of the entries section, grouped by the form heading above them. */
function readForms(document: Document): FormRows[] {
  const forms: FormRows[] = [];
  let inSection = false;

  for (const element of document.querySelectorAll(STRUCTURE_SELECTOR)) {
    if (element.tagName === 'H2') {
      inSection = readText(element) === SECTION_HEADING;
    } else if (inSection && element.tagName === 'H3') {
      forms.push({ form: readText(element), rows: [] });
    } else if (inSection) {
      const row = readRow(element);
      if (row) {
        if (!forms.length) {
          forms.push({ form: '', rows: [] });
        }
        forms[forms.length - 1].rows.push(row);
      }
    }
  }
  return forms;
}

/** The source lists games oldest first, so this returns distinct text with the most recent first. */
function distinctNewestFirst(rows: PokedexEntry[]): PokedexEntry[] {
  const entries = new Map<string, PokedexEntry>();

  for (const { text, games } of [...rows].reverse()) {
    const existing = entries.get(text);
    if (existing) {
      existing.games.push(...games);
    } else {
      entries.set(text, { text, games: [...games] });
    }
  }
  return [...entries.values()];
}

/** Returns the entries in a stored page, or null when it has none. Only text is read from the page. */
export function parsePokedexEntries(html: string): PokedexEntries | null {
  const [base, ...otherForms] = readForms(new DOMParser().parseFromString(html, 'text/html')).filter(
    ({ rows }) => rows.length,
  );
  if (!base) {
    return null;
  }

  const [lead, ...more] = distinctNewestFirst(base.rows);
  const baseTexts = new Set(base.rows.map(({ text }) => text));
  const forms = otherForms
    .map(({ form, rows }) => ({
      form,
      entries: distinctNewestFirst(rows.filter(({ text }) => !baseTexts.has(text))),
    }))
    .filter(({ entries }) => entries.length);

  return { lead, more, forms };
}
