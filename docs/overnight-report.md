# Overnight Report

This report records the work done without the project owner on the night of November 8, 2026. All of it is on the branch `integration/overnight`. Nothing was merged to `main`, and no Coveo configuration was changed.

## Item 1: combine the finished branches

The work had been built on separate branches. Four of them were started from an older `main`, so the application could not be run or tested as a whole. This item brought them together on one branch.

### What changed

- `integration/overnight` starts from `fix/code-review-findings` and merges `feature/passage-retrieval-pov`, `feature/evals`, `feature/query-suggestions-file` and `feature/detail-page`, using merge commits. The latest tips of the fix and suggestions branches, which carry the UI audit and the ranked suggestions file, were merged at the end.
- **Detail page:** `feature/detail-page` held an older copy of the fix branch, so the fix branch's versions were kept for `src/theme.css`, `src/App.test.tsx`, `e2e/search.spec.ts`, `e2e/search-box.spec.ts` and `vite.config.ts`. The detail page's new files, settings, header, card links, page choice in `src/main.tsx` and configurable test port were applied on top.
- **Build configuration:** `vite.config.ts` keeps both the check that fails a build without Coveo settings and the test include for `evals/`.
- **Shared field names:** `evals/` and `src/tooling/` now use `POKEMON_FIELDS` and the other names in `src/search/settings.ts`.
- **Suggestions file:** the ranked file has 2,236 queries: 1,028 Pokémon names at importance 1000, 28 Types and Generations at 500, 178 Type pairs at 200, and 1,002 abilities and species at 100.
- **Documentation:** the plan, handoff, architecture document and Coveo configuration README were updated to describe this combined branch.

### Test results

These ran on the final merged code.

| Check | Result |
|---|---|
| Type check | Clean |
| Unit tests | 176 passed, 17 files |
| Production build | Succeeded |
| Python tests | 11 passed |
| Browser tests | 70 passed |

Screenshots of the search page and the detail page were taken at 1100, 1440, 1920 and 2560 pixels, before the last two merges, which changed no interface code. At every width the page numbers were centered on the page (for example, center 720 on a 1440-pixel page), both facets started collapsed, and the detail page had no sideways scrolling. The search page at 1100 and 2560 pixels and the detail page at 1440 and 1920 pixels were viewed directly. The others were checked by measurement.

### Problems and limits

- Images from pokemondb.net were blocked during the screenshots, so artwork shows the fallback Pokéball.
- The browser suite added a small amount of search traffic to the `pokebowl-search` search hub.
- The ranked suggestions file is in the repository, but Coveo still has the first file until it is uploaded.

## To discuss

Nothing from this item needs a decision.
