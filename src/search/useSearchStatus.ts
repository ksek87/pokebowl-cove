import { buildSearchStatus, type SearchEngine, type SearchStatusState } from '@coveo/headless';
import { useEffect, useMemo, useState } from 'react';

export function useSearchStatus(engine: SearchEngine): SearchStatusState {
  const controller = useMemo(() => buildSearchStatus(engine), [engine]);
  const [status, setStatus] = useState(controller.state);

  useEffect(() => controller.subscribe((): void => setStatus(controller.state)), [controller]);

  return status;
}
