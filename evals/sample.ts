/** Picks the difficult cases, then fills the sample with pages spread evenly across the list. */
export function chooseSample(names: string[], difficult: string[], size: number): string[] {
  const missing = difficult.filter((name): boolean => !names.includes(name));
  if (missing.length) {
    throw new Error(`Difficult cases are not in the list: ${missing.join(', ')}`);
  }

  const chosen = new Set(difficult);
  const spread = names.filter((name): boolean => !chosen.has(name));
  const remaining = size - chosen.size;
  const step = spread.length / remaining;
  const spreadPages = Array.from({ length: remaining }, (_unused, slot): string => spread[Math.floor(slot * step)]);
  return [...new Set([...chosen, ...spreadPages])];
}

interface PacedRequests<T> {
  request: (name: string) => Promise<T>;
  wait: (ms: number) => Promise<void>;
  intervalMs: number;
}

/** Runs requests one at a time, waiting after each response except the last. */
export async function fetchPaced<T>(
  names: string[],
  { request, wait, intervalMs }: PacedRequests<T>,
): Promise<T[]> {
  const results: T[] = [];
  for (const [position, name] of names.entries()) {
    if (position) {
      await wait(intervalMs);
    }
    results.push(await request(name));
  }
  return results;
}
