import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the application heading', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Pokémon Search' })).toBeInTheDocument();
});
