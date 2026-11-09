import { expect, it } from 'vitest';
import { parsePokemonPage } from './pokemonPage.ts';

function page(firstPanelType: string, number: string): string {
  return `<h1>Mr. Mime</h1>
  <p>It is a type Pokémon introduced in <abbr title="Red">Generation 1</abbr>.</p>
  <div class="tabset-basics"><div class="sv-tabs-panel-list">
    <div class="sv-tabs-panel active">
      <img src="https://img.pokemondb.net/artwork/mr-mime.jpg">
      <table class="vitals-table"><tr><th>National №</th><td><strong>${number}</strong></td></tr>
      <tr><th>Type</th><td>${firstPanelType}</td></tr></table>
    </div>
    <div class="sv-tabs-panel">
      <img src="https://img.pokemondb.net/artwork/other-form.jpg">
      <table class="vitals-table"><tr><th>Type</th><td><a class="type-icon">Ice</a></td></tr></table>
    </div>
  </div></div>`;
}

const TWO_TYPES = '<a class="type-icon">Psychic</a> <a class="type-icon">Fairy</a>';

it('reads the values of the default form only', (): void => {
  expect(parsePokemonPage(page(TWO_TYPES, '0122'))).toEqual({
    name: 'Mr. Mime',
    number: '0122',
    types: ['Psychic', 'Fairy'],
    generation: 'Generation 1',
    image: 'https://img.pokemondb.net/artwork/mr-mime.jpg',
  });
});

it('keeps the placeholder number of a new Pokémon', (): void => {
  expect(parsePokemonPage(page(TWO_TYPES, '???')).number).toBe('???');
});

it('refuses a page that is not a Pokémon page', (): void => {
  expect((): unknown => parsePokemonPage('<h1>Moves</h1>')).toThrow(/Moves/);
});
