import type { SearchEngine } from '@coveo/headless';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ResultsPerPage } from './ResultsPerPage.tsx';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from './settings.ts';

const LARGEST_PAGE_SIZE = Math.max(...PAGE_SIZES);

const controller = vi.hoisted(() => ({
  state: { numberOfResults: Number.NaN },
  set: vi.fn(),
  subscribe: vi.fn(),
}));

const buildResultsPerPage = vi.hoisted(() => vi.fn((): typeof controller => controller));

vi.mock('@coveo/headless', () => ({ buildResultsPerPage }));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: ReactNode;
  }): JSX.Element => (
    <select
      aria-label="Results per page"
      value={value}
      onChange={(event): void => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: (): null => null,
  SelectValue: (): null => null,
  SelectContent: ({ children }: { children: ReactNode }): JSX.Element => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }): JSX.Element => (
    <option value={value}>{children}</option>
  ),
}));

const engine = {} as SearchEngine;

beforeEach((): void => {
  controller.state.numberOfResults = DEFAULT_PAGE_SIZE;
  controller.set.mockClear();
  controller.subscribe.mockReset().mockReturnValue((): void => undefined);
  buildResultsPerPage.mockClear();
});

it('starts at the default page size', (): void => {
  render(<ResultsPerPage engine={engine} />);

  expect(buildResultsPerPage).toHaveBeenCalledWith(engine, {
    initialState: { numberOfResults: DEFAULT_PAGE_SIZE },
  });
  expect(screen.getByRole('combobox', { name: 'Results per page' })).toHaveValue(
    String(DEFAULT_PAGE_SIZE),
  );
});

it('offers each page size', (): void => {
  render(<ResultsPerPage engine={engine} />);

  expect(screen.getAllByRole('option').map((option): string | null => option.textContent)).toEqual(
    PAGE_SIZES.map(String),
  );
});

it('applies the chosen page size', (): void => {
  render(<ResultsPerPage engine={engine} />);

  fireEvent.change(screen.getByRole('combobox'), { target: { value: String(LARGEST_PAGE_SIZE) } });

  expect(controller.set).toHaveBeenCalledWith(LARGEST_PAGE_SIZE);
});

it('follows changes made elsewhere, such as from the URL', (): void => {
  render(<ResultsPerPage engine={engine} />);
  const [[notify]] = controller.subscribe.mock.calls as [[() => void]];

  controller.state.numberOfResults = LARGEST_PAGE_SIZE;
  act(notify);

  expect(screen.getByRole('combobox')).toHaveValue(String(LARGEST_PAGE_SIZE));
});
