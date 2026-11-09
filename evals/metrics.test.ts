import { expect, it } from 'vitest';
import { latencyStats, percentile, proposeTarget, recallAtK, reciprocalRank } from './metrics.ts';

const RANKED = ['a', 'b', 'c', 'd'];
const TOP_TWO = 2;
const TOP_FOUR = 4;
const SAMPLES = [50, 10, 40, 20, 30];
const MEDIAN = 30;
const HIGHEST = 50;
const P50 = 50;
const P95 = 95;
const HALF = 0.5;
const THIRD = 1 / 3;
const JUST_OVER_A_STEP = 101;
const ONE_STEP = 100;
const NO_HEADROOM = 1;
const HEADROOM = 1.5;
const STEP = 50;
const TARGET = 150;

it('counts hits against the number of relevant items that can fit in K', (): void => {
  expect(recallAtK(RANKED, ['b', 'z'], TOP_TWO)).toBe(HALF);
  expect(recallAtK(RANKED, ['a', 'b', 'c', 'd', 'e'], TOP_TWO)).toBe(1);
  expect(recallAtK(RANKED, ['z'], TOP_FOUR)).toBe(0);
});

it('gives the reciprocal of the first relevant rank', (): void => {
  expect(reciprocalRank(RANKED, ['c', 'd'])).toBe(THIRD);
  expect(reciprocalRank(RANKED, ['z'])).toBe(0);
});

it('uses the nearest-rank percentile', (): void => {
  expect(percentile(SAMPLES, P50)).toBe(MEDIAN);
  expect(percentile(SAMPLES, P95)).toBe(HIGHEST);
});

it('rejects a percentile of nothing', (): void => {
  expect((): number => percentile([], P50)).toThrow();
});

it('summarizes a sample', (): void => {
  expect(latencyStats(SAMPLES)).toMatchObject({ count: SAMPLES.length, p50: MEDIAN, p95: HIGHEST });
});

it('rounds a target up from the p95 with headroom', (): void => {
  expect(proposeTarget(JUST_OVER_A_STEP, NO_HEADROOM, STEP)).toBe(TARGET);
  expect(proposeTarget(ONE_STEP, HEADROOM, STEP)).toBe(TARGET);
});
