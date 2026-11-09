import type { CoveoConfig } from '../src/config.ts';
import { rewriteSearchBody } from '../src/search/queryRewrite.ts';
import { timedAnswer, timedSearch, type SearchOptions, type TimedSearchDependencies } from './coveoQueries.ts';
import { latencyStats, proposeTarget, type LatencyStats } from './metrics.ts';

/** A target is the measured p95 plus 20%, rounded up, so a real regression stands out from noise. */
export const HEADROOM = 1.2;
export const ROUND_TO_MS = 50;
/** Layout shift is a score, not a time. It is rounded to two decimals and never targeted at zero. */
const SHIFT_STEP = 0.01;
const SHIFT_DECIMALS = 2;

/** Sends the same request body as the application, after its partial-name and Pokédex number rewrite. */
export function shippedSearch(config: CoveoConfig, options: SearchOptions, dependencies: TimedSearchDependencies = {}): ReturnType<typeof timedSearch> {
  return timedSearch(config, options, { ...dependencies, rewrite: rewriteSearchBody });
}

export function shippedAnswer(
  config: CoveoConfig,
  options: Omit<SearchOptions, 'generative'>,
  dependencies: TimedSearchDependencies = {},
): ReturnType<typeof timedAnswer> {
  return timedAnswer(config, options, { ...dependencies, rewrite: rewriteSearchBody });
}

/** One cold page load of the hosted site, then one search typed into it. Times are in milliseconds. */
export interface HostedRun {
  firstContentfulPaint: number;
  load: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstResult: number;
  searchRequest: number;
  typeAheadRequest: number;
  /** Only set on the runs that ask a question. */
  answerFirstText: number | null;
  answerComplete: number | null;
}

export type HostedSummary = Record<keyof HostedRun, LatencyStats | null>;

export function summarizeHostedRuns(runs: HostedRun[]): HostedSummary {
  const [first] = runs;
  const keys = Object.keys(first) as (keyof HostedRun)[];
  return Object.fromEntries(
    keys.map((key) => {
      const values = runs.map((entry) => entry[key]).filter((value): value is number => value !== null);
      return [key, values.length ? latencyStats(values) : null];
    }),
  ) as HostedSummary;
}

export function timingTarget(stats: LatencyStats | null): number | null {
  return stats ? proposeTarget(stats.p95, HEADROOM, ROUND_TO_MS) : null;
}

function shiftTarget(stats: LatencyStats | null): number | null {
  if (!stats) {
    return null;
  }
  const rounded = Number(proposeTarget(stats.p95, HEADROOM, SHIFT_STEP).toFixed(SHIFT_DECIMALS));
  return Math.max(rounded, SHIFT_STEP);
}

export function hostedTargets(summary: HostedSummary): Record<keyof HostedRun, number | null> {
  const targets = Object.fromEntries(
    Object.entries(summary).map(([key, stats]) => [key, timingTarget(stats)]),
  ) as Record<keyof HostedRun, number | null>;
  return { ...targets, cumulativeLayoutShift: shiftTarget(summary.cumulativeLayoutShift) };
}
