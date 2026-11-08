import { buildResultsPerPage, type SearchEngine } from '@coveo/headless';
import { type JSX, useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from './settings.ts';

export function ResultsPerPage({ engine }: { engine: SearchEngine }): JSX.Element {
  const controller = useMemo(
    () => buildResultsPerPage(engine, { initialState: { numberOfResults: DEFAULT_PAGE_SIZE } }),
    [engine],
  );
  const [pageSize, setPageSize] = useState(controller.state.numberOfResults);

  useEffect(
    () => controller.subscribe((): void => setPageSize(controller.state.numberOfResults)),
    [controller],
  );

  return (
    <div className="inline-flex items-center gap-2 text-[15px] font-bold text-muted-foreground">
      <span>Show</span>
      <Select
        value={String(pageSize)}
        onValueChange={(value): void => controller.set(Number(value))}
      >
        <SelectTrigger
          aria-label="Results per page"
          className="rounded-xl border-2 bg-card font-extrabold text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
