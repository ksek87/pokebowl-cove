import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

// Atomic documents theme variables, CSS parts and layout sections as its styling tools, so our styles never force a value.
it('styles Atomic without !important overrides', async (): Promise<void> => {
  const theme = await readFile('src/theme.css', 'utf8');

  expect(theme).not.toContain('!important');
});
