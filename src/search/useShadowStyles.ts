import { useCallback } from 'react';
import themeStyles from '../theme.css?inline';

let sharedSheet: CSSStyleSheet | undefined;

function getSharedSheet(): CSSStyleSheet {
  if (!sharedSheet) {
    sharedSheet = new CSSStyleSheet();
    sharedSheet.replaceSync(themeStyles);
  }
  return sharedSheet;
}

/**
 * Atomic renders result templates inside Shadow DOM, where page styles do not
 * reach. One stylesheet is shared by all results instead of being copied.
 */
export function useShadowStyles(): (node: Element | null) => void {
  return useCallback((node: Element | null): void => {
    const root = node?.getRootNode();
    if (!(root instanceof ShadowRoot)) {
      return;
    }
    const sheet = getSharedSheet();
    if (!root.adoptedStyleSheets.includes(sheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
  }, []);
}
