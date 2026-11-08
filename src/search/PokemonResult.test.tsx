import type { Result } from '@coveo/headless';
import { fireEvent, render, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { POKEMON_RESULT_FIELDS, PokemonResult } from './PokemonResult.tsx';

vi.mock('@coveo/atomic-react', () => ({
  AtomicResultLink: ({ children }: { children?: ReactNode }): JSX.Element => <a href="#result">{children}</a>,
}));

function pokemon(raw: Record<string, unknown>): Result {
  return { raw: { pokemon_name: 'Charizard', ...raw } } as unknown as Result;
}

const charizard = pokemon({
  pokemon_image: 'https://img.pokemondb.net/artwork/charizard.jpg',
  pokemon_number: '0006',
  pokemon_type: ['Fire', 'Flying'],
  pokemon_generation: 'Generation 1',
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

  expect(screen.getByAltText('Charizard')).toHaveAttribute('src', '/pokeball.svg');
});

it('uses the fallback when the picture is missing', (): void => {
  render(<PokemonResult result={pokemon({})} />);

  expect(screen.getByAltText('Charizard')).toHaveAttribute('src', '/pokeball.svg');
});

it('shows number, Types and a short Generation label', (): void => {
  render(<PokemonResult result={charizard} />);

  expect(screen.getByText('#0006')).toBeInTheDocument();
  expect(screen.getByText('Fire')).toBeInTheDocument();
  expect(screen.getByText('Flying')).toBeInTheDocument();
  expect(screen.getByText('Gen 1')).toBeInTheDocument();
});

it('omits the number when it is not known', (): void => {
  render(<PokemonResult result={pokemon({ pokemon_number: '???' })} />);

  expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
});

it('requests the fields the card displays', (): void => {
  expect(POKEMON_RESULT_FIELDS).toEqual(
    expect.arrayContaining([
      'pokemon_name',
      'pokemon_image',
      'pokemon_number',
      'pokemon_type',
      'pokemon_generation',
    ]),
  );
});
