const PERCENT = 100;
const MEDIAN_PERCENTILE = 50;
const TAIL_PERCENTILE = 95;

export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
}

/**
 * Share of the relevant items found in the top K, out of those that can fit in K.
 * A Type has far more members than a page holds, so plain recall could never reach 1.
 */
export function recallAtK(ranked: string[], relevant: string[], k: number): number {
  const wanted = new Set(relevant);
  const hits = ranked.slice(0, k).filter((id): boolean => wanted.has(id)).length;
  return hits / Math.min(k, relevant.length);
}

export function reciprocalRank(ranked: string[], relevant: string[]): number {
  const wanted = new Set(relevant);
  const position = ranked.findIndex((id): boolean => wanted.has(id));
  return position < 0 ? 0 : 1 / (position + 1);
}

/** 1 when the top min(relevant count, K) positions are all relevant, otherwise 0. MRR sees only the first hit. */
export function namesFirst(ranked: string[], relevant: string[], k: number): number {
  const wanted = new Set(relevant);
  const positions = Math.min(relevant.length, k);
  const top = ranked.slice(0, positions);
  return top.length === positions && top.every((id): boolean => wanted.has(id)) ? 1 : 0;
}

/** Share of the results shown in the top K that are relevant. */
export function precisionAtK(ranked: string[], relevant: string[], k: number): number {
  const wanted = new Set(relevant);
  const top = ranked.slice(0, k);
  return top.length ? top.filter((id): boolean => wanted.has(id)).length / top.length : 0;
}

/** Nearest-rank percentile, so every reported value was actually observed. */
export function percentile(values: number[], rank: number): number {
  if (!values.length) {
    throw new Error('Cannot take a percentile of an empty sample.');
  }
  const sorted = [...values].sort((a, b): number => a - b);
  return sorted[Math.ceil((rank / PERCENT) * sorted.length) - 1];
}

export function latencyStats(values: number[]): LatencyStats {
  return {
    count: values.length,
    p50: percentile(values, MEDIAN_PERCENTILE),
    p95: percentile(values, TAIL_PERCENTILE),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** A target just above what was measured, so a regression stands out. */
export function proposeTarget(p95: number, headroom: number, roundTo: number): number {
  return Math.ceil((p95 * headroom) / roundTo) * roundTo;
}
