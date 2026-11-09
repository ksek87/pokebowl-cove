import type { Result } from '@coveo/headless';
import { fireEvent, render, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { PokemonResult } from './PokemonResult.tsx';
import { POKEBALL_IMAGE, POKEMON_FIELDS, UNKNOWN_POKEDEX_NUMBER } from './settings.ts';

vi.mock('@coveo/atomic-react', () => ({
  AtomicResultLink: ({ children }: { children?: ReactNode }): JSX.Element => <a href="#result">{children}</a>,
}));

function pokemon(raw: Record<string, unknown>): Result {
  return { raw: { [POKEMON_FIELDS.name]: 'Charizard', ...raw } } as unknown as Result;
}

const charizard = pokemon({
  [POKEMON_FIELDS.image]: 'https://img.pokemondb.net/artwork/charizard.jpg',
  [POKEMON_FIELDS.number]: '0006',
  [POKEMON_FIELDS.type]: ['Fire', 'Flying'],
  [POKEMON_FIELDS.generation]: 'Generation 1',
});

it('links the Pokémon name to the result', (): void => {
  render(<PokemonResult result={charizard} />);

  expect(screen.getByRole('link', { name: 'Charizard' })).toBeInTheDocument();
});

it('shows the picture with the name as alt text', (): void => {
  render(<PokemonResult result={charizard} />);

  expect(screen.getByAltText('Charizard')).toHaveAttribute(
    'src',
    'https://img.pokemondb.net/artwork/charizard.jpg',
  );
});

it('swaps to the fallback when the picture fails to load', (): void => {
  render(<PokemonResult result={charizard} />);

  fireEvent.error(screen.getByAltText('Charizard'));

  expect(screen.getByAltText('Charizard')).toHaveAttribute('src', POKEBALL_IMAGE);
});

it('uses the fallback when the picture is missing', (): void => {
  render(<PokemonResult result={pokemon({})} />);

  expect(screen.getByAltText('Charizard')).toHaveAttribute('src', POKEBALL_IMAGE);
});

it('shows number, Types and a short Generation label', (): void => {
  render(<PokemonResult result={charizard} />);

  expect(screen.getByText('#0006')).toBeInTheDocument();
  expect(screen.getByText('Fire')).toBeInTheDocument();
  expect(screen.getByText('Flying')).toBeInTheDocument();
  expect(screen.getByText('Gen 1')).toBeInTheDocument();
});

it('omits the number when it is not known', (): void => {
  render(<PokemonResult result={pokemon({ [POKEMON_FIELDS.number]: UNKNOWN_POKEDEX_NUMBER })} />);

  expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
});
