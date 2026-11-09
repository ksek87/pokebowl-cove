# Overnight Report

> **Archived.** This overnight work report is a point-in-time record. Open items moved to `docs/plan.md` and `docs/handoff.md`.

This report records the work done on the night of November 8, 2026, while the project owner was away. All of it is on the branch `integration/overnight`. Nothing was merged to `main`, and no Coveo configuration was changed.

## Summary

All six agreed items are done. The application now has the review fixes, the detail page, designed loading, no-results and error states, restrained motion and generated answers, combined and tested together on one branch.

| Final check on `integration/overnight` | Result |
|---|---|
| Type check | Clean |
| Unit tests | 186 passed, 18 files |
| Production build | Succeeded |
| Python tests | 11 passed |
| Browser tests | 109 passed |
| Search for the Coveo key in tracked files | 0 matches |

`integration/overnight` contains `fix/code-review-findings`, `feature/detail-page`, `feature/evals`, `feature/query-suggestions-file` and `feature/passage-retrieval-pov`, so a single pull request is enough.

To run it: check out the branch, run `fnm use`, `npm ci` and `npm run dev`, and open http://localhost:5173/.

## What the user needs to do

1. Open a pull request for `integration/overnight` into `main`, and merge it with **Create a merge commit**.
2. Upload the ranked `configs/coveo/query-suggestions-default-queries.csv` with the same API values as before, and let a build run. Coveo still has the first version, so Charizard is not yet near the top for `char`.
3. Search `25` in the application, then check in **Visit Browser** whether that search shows `25` or a blank query (CR-17).
4. Check the 11 difficult eval pages by hand, such as Farfetch'd, Nidoran♀ and Type: Null.
5. Create the eval API key, which unblocks the relevance evals (PC-42) and browser tests in CI.
6. Set up hosting on Vercel (PC-30). Set the two Coveo values as build variables, because a build now fails without them.

## What will look different

- The search page: sort works, page numbers are centered on the page, the Type and Generation sections start closed, the page size uses Atomic's buttons, and the summary, sort and page size stay in one fixed row.
- Clicking a card opens a Pokémon detail page, at a URL such as `/?pokemon=Charizard`.
- A question-style search shows a generated answer above the results, with citations and a disclaimer.
- No-results and error states use our design, with an action to recover.
- Loading placeholders match the cards. Cards lift on hover, and results and opened sections fade in. All motion stops when reduced motion is requested.
- Focus outlines are solid and consistent, and typed search text is darker than the placeholder.

## Items

| Item | Result | Where |
|---|---|---|
| 1. Combine the finished branches | Done | Section below |
| 2. Fix audit findings that need no decision | Done | Section below |
| 3. Livelier interface and designed states | Done | Section below |
| 4. Generated answers (PC-62, PC-77) | Done | Section below |
| 5. Correct the Passage Retrieval document (PC-83) | Done | `docs/passage-retrieval.md`, section below |
| 6. Check `npm audit` | Done | Section below |

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

- **Fixed from `docs/archive/ui-audit.md`:** UI-01, UI-02, UI-03, UI-04, UI-08, UI-09, UI-10, UI-13, UI-15, UI-16, UI-17, UI-22, the heading and control styling of UI-12, and the placeholder, retry and status region of UI-11.
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

## Item 5: Passage Retrieval document (PC-83)

The document was corrected after reading in full the API reference section, the content requirements, the MCP client reference and the API key templates. The privilege the API needs is now stated from Coveo's reference, the expected result for an unrelated question is corrected, and the Hosted MCP part is a short concept section that says it is not planned work. Nothing was tested, because Passage Retrieval is not enabled. Commit: `7aa433d`.

## Item 6: dependency audit

`npm audit` reports 9 high and 1 low finding, and npm offers no fix. All come from packages that Coveo's Atomic and Headless bring in. They reduce to one `zod` advisory and two `i18next-http-backend` advisories; the other entries are packages that depend on those.

| Advisory | Package path | Reachable in our use? |
|---|---|---|
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), memory exhaustion in validation | Headless, `@ag-ui/client`, `zod` | No. Headless calls this code only when a generated answer has an `agentId`, and we set none. It is in the browser bundle but is not run |
| [GHSA-3cmx-xjww-583x](https://github.com/advisories/GHSA-3cmx-xjww-583x), query-parameter injection through the language value | Atomic, `i18next-http-backend` | No. Atomic puts the language in the load path, but we do not set the language from user input |
| [GHSA-9jhj-wvmw-cfx5](https://github.com/advisories/GHSA-9jhj-wvmw-cfx5), namespace forming a protocol-relative URL | Atomic, `i18next-http-backend` | No. The namespace is not user input |

These are runtime dependencies, not development-only ones. No dependency or override was changed. Recommendation, for the owner to decide: leave them, update when Coveo releases new packages, and repeat this check if an `agentId` is ever added.

## Commits

| Commit | Content |
|---|---|
| `30e1732` | Branches combined and first report |
| `9467215` | Designed states and audit fixes |
| `a3761ea` | Audit results and open decisions recorded |
| `8574c71` | Generated answers and matching suggestion panel |
| `aab672c` | Generated answers recorded |
| Latest commit on the branch | Dependency audit, this report and final documentation |

## Screenshots

- Search page and states at each width: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/final/`, named `{state}-{1100,1440,1920,2560}.png`, with a contact sheet per width.
- Generated answers: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/answers/`.
- Detail page: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/detail-shots/`.
- Interface audit: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/`.

## What was not verified

- Real artwork in most screenshots, because pokemondb.net images were blocked. Real artwork was viewed on the home page and the Charizard detail page during the audit.
- Screenshots at 1920 and 2560 pixels for designed states were reviewed on low-detail contact sheets. Positions were measured at every width.
- Whether a card click event reaches Coveo in production. The browser test saw the event sent, with a mocked response.
- A real query that has results but no generated answer, other than a non-relevance sort.
- When a generated answer counts against the allowance. The search response carries an answer ID for any text query.
- Real screen readers and browsers other than Chromium.
- The browser suite added a small amount of search traffic to the `pokebowl-search` hub.

## To discuss

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

**Noted, no decision needed yet:** with the Semantic Encoder active, a nonsense text query can still return results.

**Other open points:**

- CR-11: whether a smaller stylesheet for cards is worthwhile. It is about 2.5% of the gzipped JavaScript. Decide with the performance baseline (PC-43).
- CR-04: text typed right after the clear button, before the search returns, can still be replaced. There is no clean public way to prevent it.
- An arriving generated answer moves the cards down, because the page cannot know in advance whether an answer will exist.
- `npm audit`: confirm the recommendation in Item 6.

**Strayed from the plan:** nothing was added beyond the agreed list. The type-ahead panel alignment from UI-18 was changed as part of PC-77, because that ticket requires matching the design. Whether an empty box shows suggestions remains open.
