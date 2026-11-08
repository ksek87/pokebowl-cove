import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { POKEMON_RESULT_FIELDS, PokemonResult } from './PokemonResult';

vi.mock('@coveo/atomic-react', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    AtomicResultSectionVisual: passthrough,
    AtomicResultSectionTitle: passthrough,
    AtomicResultLink: ({ children }: { children?: ReactNode }) => <a href="#result">{children}</a>,
    AtomicResultText: ({ field }: { field: string }) => <span>{field}</span>,
    AtomicResultImage: ({
      field,
      imageAltField,
      fallback,
    }: {
      field: string;
      imageAltField: string;
      fallback: string;
    }) => <img data-field={field} data-alt-field={imageAltField} src={fallback} alt="picture" />,
  };
});

it('links the Pokémon name to the result', () => {
  render(<PokemonResult />);

  expect(screen.getByRole('link', { name: 'pokemon_name' })).toBeInTheDocument();
});

it('shows the picture with the name as alt text and a fallback image', () => {
  render(<PokemonResult />);

  const image = screen.getByAltText('picture');
  expect(image).toHaveAttribute('data-field', 'pokemon_image');
  expect(image).toHaveAttribute('data-alt-field', 'pokemon_name');
  expect(image).toHaveAttribute('src', '/pokeball.svg');
});

it('requests the fields the template displays', () => {
  expect(POKEMON_RESULT_FIELDS).toEqual(expect.arrayContaining(['pokemon_name', 'pokemon_image']));
});
