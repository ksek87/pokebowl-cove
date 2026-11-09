import type { JSX } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DEFAULT_PAGE_SIZE, FACET_PLACEHOLDER_COUNT } from './settings.ts';

const BLOCK = 'rounded bg-muted text-transparent';
const PULSE = 'animate-pulse motion-reduce:animate-none';

/** Uses the same text sizes as a result card, so the height matches without being measured. */
function ResultPlaceholder(): JSX.Element {
  return (
    <div
      data-slot="result-placeholder"
      className={`flex flex-col overflow-hidden rounded-(--radius-panel) border-2 border-b-(length:--size-card-edge) border-border bg-card ${PULSE}`}
    >
      <div className="aspect-[4/3] bg-muted" />
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex justify-between text-(length:--text-small) font-bold">
          <span className={BLOCK}>#0000</span>
          <span className={BLOCK}>Gen 0</span>
        </div>
        <p className="mt-0.5 mb-2.5 text-lg/snug font-extrabold">
          <span className={BLOCK}>Placeholder</span>
        </p>
        <Badge className={`px-3 text-(length:--text-small) font-extrabold ${BLOCK}`}>Type</Badge>
      </div>
    </div>
  );
}

export function ResultPlaceholders(): JSX.Element {
  return (
    <div data-slot="result-placeholders" aria-hidden="true">
      {Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => (
        <ResultPlaceholder key={index} />
      ))}
    </div>
  );
}

export function FacetPlaceholders(): JSX.Element {
  return (
    <div data-slot="facet-placeholders" aria-hidden="true">
      {Array.from({ length: FACET_PLACEHOLDER_COUNT }, (_, index) => (
        <div key={index} data-slot="facet-placeholder" className={`flex items-center ${PULSE}`}>
          <span className={`${BLOCK} text-lg font-extrabold`}>Facet</span>
        </div>
      ))}
    </div>
  );
}

export function DetailPlaceholder(): JSX.Element {
  return (
    <Card
      data-slot="detail-placeholder"
      className={`overflow-hidden border-border rounded-(--radius-panel) border-(length:--size-panel-border) border-b-(length:--size-card-edge) py-0 shadow-none ${PULSE}`}
    >
      <div className="grid lg:grid-cols-2">
        <div className="aspect-square bg-muted" />
        <div className="grid content-start gap-5 p-8" aria-hidden="true">
          <span className={`${BLOCK} w-24`}>#0000</span>
          <span className={`${BLOCK} w-2/3 text-4xl`}>Name</span>
          <span className={`${BLOCK} h-28`} />
          <span className={`${BLOCK} h-40`} />
        </div>
      </div>
    </Card>
  );
}
