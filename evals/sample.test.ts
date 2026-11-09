import { expect, it, vi } from 'vitest';
import { chooseSample, fetchPaced } from './sample.ts';

const LIST_LENGTH = 100;
const NAMES = Array.from({ length: LIST_LENGTH }, (_unused, index): string => `pokemon-${index}`);
const SAMPLE_SIZE = 10;
const INTERVAL_MS = 2000;
const DIFFICULT = ['pokemon-3', 'pokemon-3', 'pokemon-97'];
const LAST_STRETCH_START = LIST_LENGTH - LIST_LENGTH / SAMPLE_SIZE - SAMPLE_SIZE;

it('includes difficult cases once and reaches the requested size', (): void => {
  const sample = chooseSample(NAMES, DIFFICULT, SAMPLE_SIZE);

  expect(sample).toHaveLength(SAMPLE_SIZE);
  expect(new Set(sample).size).toBe(SAMPLE_SIZE);
  expect(sample).toEqual(expect.arrayContaining(['pokemon-3', 'pokemon-97']));
});

it('spreads the remaining pages across the whole list', (): void => {
  const sample = chooseSample(NAMES, [], SAMPLE_SIZE);

  const [firstName] = NAMES;

  expect(sample).toContain(firstName);
  expect(NAMES.indexOf(sample.pop() ?? '')).toBeGreaterThan(LAST_STRETCH_START);
});

it('gives the same sample every time', (): void => {
  expect(chooseSample(NAMES, DIFFICULT, SAMPLE_SIZE)).toEqual(chooseSample(NAMES, DIFFICULT, SAMPLE_SIZE));
});

it('fails when a difficult case is not in the list', (): void => {
  expect((): unknown => chooseSample(NAMES, ['missingno'], SAMPLE_SIZE)).toThrow(/missingno/);
});

it('waits between requests and not after the last one', async (): Promise<void> => {
  const events: string[] = [];
  const wait = vi.fn(async (ms: number): Promise<void> => {
    events.push(`wait ${ms}`);
  });
  const request = async (name: string): Promise<string> => {
    events.push(name);
    return name.toUpperCase();
  };

  await expect(fetchPaced(['a', 'b'], { request, wait, intervalMs: INTERVAL_MS })).resolves.toEqual(['A', 'B']);
  expect(events).toEqual(['a', `wait ${INTERVAL_MS}`, 'b']);
});
