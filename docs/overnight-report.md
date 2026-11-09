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

## Items 2 and 3: interface audit fixes, designed states and motion

### What changed

- **Fixed from `docs/ui-audit.md`:** UI-01, UI-02, UI-03, UI-04, UI-08, UI-09, UI-10, UI-13, UI-15, UI-16, UI-17, UI-22, the heading and control styling of UI-12, and the placeholder, retry and status region of UI-11.
- **Designed states (PC-76):** no-results and error views show the Pokéball, plain wording and one action. Loading matches the real cards and facets.
- **Motion:** card lift and press, control transitions, and fades on new results and opened facets. All of it stops when reduced motion is requested.
- **UI-14:** loose values have names. The layout overrides were not restructured.
- **Unchanged by decision:** the page numbering stays centered on the page, the search box stays centered, and Best match stays.

### Results

| Check | Result |
|---|---|
| Type check | Clean |
| Unit tests | 185 passed |
| Production build | Succeeded |
| Python tests | 11 passed |
| Browser tests | 96 passed |

Code commit: `9467215`. Full-page screenshots were taken at 1100, 1440, 1920 and 2560 pixels for the home page, search, correction, number lookup, no results, error, loading, and the detail page in normal, not-found, loading and error states. They were reviewed on one contact sheet per width, with individual pages viewed for no results and loading. The page numbers stayed centered on the page at every width, and both facets started collapsed. Images from pokemondb.net were blocked, so artwork shows the fallback Pokéball.

## Item 4: generated answers (PC-62, PC-77)

Added Atomic's generated answer at the top of the results, styled through its CSS parts, with Atomic's disclaimer, citations and a collapsible long answer. The type-ahead panel now matches the search box.

**Real answers used (3 distinct questions, plus one earlier direct API check):**

| Question | Result |
|---|---|
| what type is charizard | Answer streamed with a citation. After sorting by Name A to Z, the answer disappeared and the results stayed, with no error |
| which pokemon evolves into charizard | Answer streamed with a citation |
| who won the 1998 world cup | The page showed no result cards, so no answer was checked |

**Stubbed:** every check in the browser suite, including all four widths. Answer text in those screenshots is test text.

**Results:** type check clean, build succeeds, 186 unit, 109 browser and 11 Python tests pass. The key scan found 0 matches.

**Not checked:** a real query that has results but no answer, other than the sorted case. Answer quality is left to PC-63 and PC-44. Real answers can repeat source quotations, such as the "This information is directly supported" wording seen in one answer.

## To discuss

**Wording to review (UI-01, UI-02):**

| State | Title | Text | Action |
|---|---|---|---|
| Error | Search is not available right now | The Pokémon could not be loaded. Check your connection and try again. | Try again |
| No results, text search | No Pokémon found | Nothing matched “query”. Try a different name, Type or ability. | Show all Pokémon |
| No results, number search | No Pokémon found | There is no Pokémon with Pokédex number #9999. | Show all Pokémon |
| No results, filters only | No Pokémon found | Nothing matched these filters. | Show all Pokémon |
| Detail page error | Something went wrong | The Pokémon could not be loaded. | Try again |

**Decisions from the interface audit:**

- UI-05: the search box stays centered on the page. Confirm, or span it across the results column.
- UI-06: whether to add a wider layout above 1920 pixels.
- UI-11: whether not-found suggests close matches.
- UI-12: whether the detail page has a search box.
- UI-14: whether to restructure the Atomic layout overrides. This was not done, because it could disturb the page centering.
- UI-18: whether an empty search box shows suggestions.
- UI-19: whether to hide sort and page size for very small result sets.
- UI-20: the wording of the number lookup notice.
- UI-24: whether to keep filters or search in view on long pages.

- Generated answers: the answer disappears on a non-relevance sort, as Coveo documents. Confirm that is acceptable, or consider hiding the sort while an answer shows.
- Generated answers: whether a citation should open the application's detail page rather than pokemondb.net. It opens the source page now.

**Noted, no decision needed yet:** with the Semantic Encoder active, a nonsense text query can still return results.
