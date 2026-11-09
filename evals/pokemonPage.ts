import { load } from 'cheerio';

export interface PokemonValues {
  name: string;
  number: string;
  types: string[];
  generation: string;
  image: string;
}

function required(value: string | undefined, label: string, pageName: string): string {
  if (!value) {
    throw new Error(`Page "${pageName}" has no ${label}, so it is not a Pokémon page.`);
  }
  return value.trim();
}

/** Reads the values of the default form, which is the first tab of a Pokémon page. */
export function parsePokemonPage(html: string): PokemonValues {
  const $ = load(html);
  const name = $('h1').first().text().trim();
  const panel = $('.tabset-basics .sv-tabs-panel').first();
  const row = (label: RegExp): ReturnType<typeof panel.find> =>
    panel.find('th').filter((_index, cell): boolean => label.test($(cell).text().trim())).first().next('td');

  return {
    name,
    number: required(row(/National/).find('strong').first().text(), 'Pokédex number', name),
    types: row(/^Type$/).find('a').toArray().map((link): string => $(link).text().trim()),
    generation: required(
      $('p').filter((_index, paragraph): boolean => $(paragraph).text().includes('introduced in')).find('abbr').first().text(),
      'Generation',
      name,
    ),
    image: required(panel.find('img').first().attr('src'), 'image', name),
  };
}
