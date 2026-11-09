# Code Review

This document reviews the Pokémon search application in this repository. The application is built with React and Vite on Coveo Atomic and Headless, and it searches an index of pokemondb.net pages. The findings below were written before any fixes.

**Fix status, November 8, 2026.** On branch `fix/code-review-findings`, each with a test written first where behavior changed:

- **Fixed:** CR-01, CR-02, CR-03, CR-04, CR-05, CR-06, CR-07, CR-08, CR-09, CR-10, CR-12, CR-13, CR-14, CR-15 and CR-19.
- **Fixed by decision:** CR-16. Best match stays the default label, following the common industry pattern. See `docs/architecture.md`, section Search behavior.
- **Fixed:** CR-18. Each interactive control now has a browser test through the control itself, the request hook has unit tests, and `App.test.tsx` keeps only checks of our markup and of configuration passed to Atomic.
- **Waiting on evidence:** CR-17. Documentation suggests lookups are recorded with empty text. The check to make in Usage Analytics is in the CR-17 entry.
- **Measured, decision deferred:** CR-11. The numbers are in the CR-11 entry for PC-43.
- **Remaining limit of CR-04:** after the clear button is used, text typed before the search returns can still be replaced. Typing after emptying the box by keyboard is no longer affected. The reason it stays is in the CR-04 entry.

The review covers `src/` (except the generated files in `src/components/ui`), the browser tests in `e2e/`, and the Coveo settings that affect the application. Each finding was checked by reading the code path. Most were also reproduced in a real browser against the live search index. See [Not verified](#not-verified) for the limits.

Each finding is marked:

- **Confirmed:** reproduced in a browser, or proven from the code.
- **Plausible:** reasoned from evidence, but not proven.

## Summary

The application is small and mostly well organized. Controller subscriptions are cleaned up correctly, secrets are handled properly, and the search wiring is simple. Its weak points are the behaviors added on top of Atomic and tests that do not exercise those behaviors.

The issues that matter most:

| ID | Issue | Why it matters |
|---|---|---|
| CR-01 | Choosing a sort option breaks the whole page | Two of the three sort options fail every time, and this is a visible part of the demonstration |
| CR-05 | A bad sort value in the URL leaves the application stuck | Reloading and searching again both fail, and the controls to change the sort are gone |
| CR-02 | Clearing a search on a later page keeps that page | The home page opens in the middle of the Pokédex |
| CR-04 | Text typed just after emptying the box is erased | People lose what they are typing, and the risk is greater with type-ahead coming next |
| CR-07 | Emptying the box by keyboard counts as a submitted search | It fires an unrequested search and records a false event in the analytics that train models |
| CR-17 | Number-only searches may reach analytics as empty queries | It contradicts a statement in `docs/architecture.md`, and a panel could ask about it |
| CR-18 | Tests mock away the behavior they claim to cover | This is how the sort bug reached a handoff that said sorting worked |

## The sort bug

This section explains CR-01 in detail.

**Symptom.** On the home page, changing the sort from Best match to Pokédex number shows "Something went wrong." The facets, the result summary and the sort control disappear.

**Root cause.** One constant is used for two different syntaxes.

`POKEDEX_SORT` and `NAME_SORT` in `src/search/settings.ts:26-27` have the form `@field ascending`. That form is correct for the Search API, and the request hook in `src/search/queryRewrite.ts:26` uses it that way. `src/App.tsx:101-102` also passes the same constants to `AtomicSortExpression`, which expects the field name without `@`.

Atomic parses the expression and treats the first word as the field name, so the field becomes `@pokemon_number`. Headless then builds the request value by adding another `@`, which gives `@@pokemon_number ascending`. The Search API rejects it with HTTP 400.

The code path in the installed packages:

1. `@coveo/atomic` `atomic-sort-dropdown.js`, `buildOptions`, calls `parseCriterionExpression(expression)`.
2. `@coveo/headless` `features/sort-criteria/criteria-parser.js` splits the text on spaces and uses the first word as the field.
3. `@coveo/headless` `features/sort-criteria/criteria.js`, `buildCriterionExpression`, returns `` `@${criterion.field} ${criterion.order}` ``.

**What Coveo documents.**

- The Search API reference lists the `sortCriteria` format as `@[field] ascending` or `@[field] descending` for a sortable field ([Search API reference](https://docs.coveo.com/en/13)).
- The Atomic type documentation for `expression` lists `<FIELD> ascending` and gives the example `size ascending`, without `@` (`@coveo/atomic` 3.65.0, `atomic-sort-expression.d.ts`, the same text as in the Headless parser).
- Our inference: the two formats differ, and the shared constant only satisfies one of them.

**Evidence from a real browser.**

| Action | Request sent | Response |
|---|---|---|
| Open the home page | `@pokemon_number ascending` | 200, 1,028 results, starts at Bulbasaur |
| Choose Pokédex number | `@@pokemon_number ascending` | 400, `Invalid field name: @@pokemon_number` |
| Choose Name A to Z | `@@pokemon_name ascending` | 400, `Invalid field name: @@pokemon_name` |

Best match does not fail, but it cannot be chosen once the sort control has gone. The same doubled value is written to the URL as `#sortCriteria=%40%40pokemon_number%20ascending`.

**Checking the cause.** The compiled `App.tsx` was changed in the browser only, so the expressions became `pokemon_number ascending` and `pokemon_name ascending`. With that one change, all three options worked. Requests carried a single `@`, Name A to Z started at Abomasnow, and the dropdown showed the selected label each time. No repository file was changed for this check.

**What the cause is not.** The fields are sortable, because the same fields sort correctly with one `@`. The string values and `???` numbers are not involved. Numbers are zero-padded, so string order matches numeric order, and the Pokémon without a number sort last on the final page, as `docs/architecture.md` states.

**Why the screen looks broken.** Atomic hides its facets, sort control and summary when a search fails, and shows its error illustration. The page-size control is a custom component and has no such check, so "Show 12" stays alone at the top right. The facets column keeps its width, so the illustration sits to the right of center. See CR-08.

**Why the tests did not catch it.**

- `src/App.test.tsx:35-36` replaces `AtomicSortExpression` with a mock that renders the label and ignores `expression`. The test at `src/App.test.tsx:97-104` therefore proves only that three labels exist.
- `e2e/search.spec.ts:207-213`, named "sorts results by name", opens a URL that already contains the correct `@pokemon_name ascending`. A URL value goes straight into state and bypasses `parseCriterionExpression`, which is the path that fails. It never touches the dropdown.
- The home page test passes because the request hook uses the constant correctly.
- That URL route also has a visible defect that no test checks: the dropdown shows Best match while the results are sorted by name, because the doubled value never equals the state.
- No test selects a sort option in a browser.

## Findings

### 1. Bugs

#### CR-01: Choosing a sort option breaks the page

- **Severity:** High. **Status:** Confirmed.
- **Where:** `src/App.tsx:101-102`, `src/search/settings.ts:26-27`.
- **What is wrong:** the `@field ascending` constants are passed to an Atomic property that expects `field ascending`. See [The sort bug](#the-sort-bug).
- **Failure:** choosing Pokédex number or Name A to Z sends `@@field ascending`, the API returns 400, and the page shows the error state.
- **Direction to discuss:** derive both forms from one named field and order, so the two syntaxes cannot be confused. Add a browser test that selects each option through the dropdown. Check every option at the desired window widths after the fix.

#### CR-02: Clearing a search on a later page keeps that page

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** `src/search/showAllWhenCleared.ts:26-27`.
- **What is wrong:** the code updates the query and runs a search, but it does not reset the page. Headless resets the page when a search box is submitted (`prepareForSearchWithQuery` in `features/search/search-actions.js`), and the pagination reducer has no case for `updateQuery`.
- **Failure:** search for `fire`, go to page 3, then clear the box. The URL becomes `/#firstResult=24`, and the Pokédex list starts at #0025 Pikachu instead of #0001 Bulbasaur.
- **Direction to discuss:** make the clear behave like a real submit, so that page and any related state are reset together. Reusing the Headless behavior is better than reassembling it, if it can be reached from outside the search box.

#### CR-03: The Pokédex notice says "Showing" when nothing is shown

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** `src/search/PokedexLookupNotice.tsx:14-28`.
- **What is wrong:** the notice depends only on the query text. It does not check whether a result came back or the search failed.
- **Failure:** `/#q=9999` returns no results, but the notice says "Showing Pokédex number #9999". The same text appears for any unused number, for `0`, which becomes `#0000`, and when the network request fails.
- **Direction to discuss:** decide what the page should say for an unknown number, then let the notice read the search status. Whether to give a dedicated message or rely on Atomic's no-results message is a product choice for the user.

### 2. Bad state handling

#### CR-04: Text typed just after emptying the box is erased

- **Severity:** Medium. **Status:** Confirmed, using an added 900 ms response delay.
- **Where:** `src/search/showAllWhenCleared.ts:18-28`, together with `features/query-set/query-set-slice.js` in Headless.
- **What is wrong:** when any search finishes, Headless replaces the text in every search box with the query that was executed. Normally a person has just submitted and is not typing. Here the application starts a search the moment the box becomes empty, which is exactly when a person is often about to type.
- **Failure:** with a slow response, delete the text and type `pik`. The box shows `pik` until the response arrives, then becomes empty. The time at risk equals the response time, so faster networks shrink it but do not remove it. Type-ahead (PC-51) makes this path more common.
- **Direction to discuss:** this shares a decision with CR-07. Options are to search only when the clear button is used, or to delay the search briefly and cancel it if typing resumes. The tradeoff is simplicity against how immediately the page resets.
- **Remaining limit, left as is.** Text typed after using the clear button and before that search returns can still be replaced. The Headless query-set reducer copies the executed query into every search box when any search finishes (`executeSearch.fulfilled` in `features/query-set/query-set-slice.js`), and no public option turns that off. The same behavior applies to every search in an Atomic interface, including one started with Enter. The only workaround is to record typed text during the request and write it back afterward, which works against Headless state for a very short window. The window now opens only after an explicit click on the clear button.

#### CR-05: A bad sort value in the URL leaves the application stuck

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** URL state in `src/App.tsx:70` (Atomic reflects state in the URL by default). There is no validation in application code.
- **What is wrong:** Headless restores `sortCriteria` from the URL exactly as written, and Atomic removes the sort control when a search fails.
- **Failure:** after CR-01, reloading `/#sortCriteria=%40%40pokemon_name%20ascending` still returns 400. A new search for `pikachu` also returns 400, because the bad sort stays in state. There is no control left to change it. By reading the code, the logo link is the only way out, because it loads `/` with no URL state. Any other invalid value in a hand-edited or outdated link gives the same result.
- **Direction to discuss:** whether to accept only offered sort values from the URL, and whether the error page should offer a visible way back. PC-76 (designed states) is the natural place for the second part. Fixing CR-01 removes the common cause but not this path.

#### CR-06: A page size in the URL that is not offered leaves the control blank

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/ResultsPerPage.tsx:17-29`.
- **What is wrong:** the control displays whatever number is in state, and that value may not be in `PAGE_SIZES`.
- **Failure:** `/#numberOfResults=50` shows 50 results, an empty page-size control, and rows that are not full at four columns. This breaks the rule that page sizes keep every row full.
- **Direction to discuss:** treat an unsupported size as the default, or accept it and show it. The first protects the grid rule.

### 3. Poor flow

#### CR-07: Emptying the box by keyboard counts as a submitted search

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** `src/search/showAllWhenCleared.ts:8-12, 25-27`.
- **What is wrong:** the code infers "cleared" from state, so it cannot tell the clear button from Backspace, Select All and Delete, or Cut. It also records the search as `logSearchboxSubmit`, although nobody submitted anything.
- **Failure:** delete the last character of a search with Backspace. The application immediately searches with `q: ""` and `actionCause: "searchboxSubmit"`, without Enter. Results change while the person may still be editing, and a false submit is added to analytics that train models.
- **Direction to discuss:** decide whether keyboard emptying should search at all, and which analytics event describes this action honestly. This shares a decision with CR-04.

#### CR-08: Our controls ignore search status

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/ResultsPerPage.tsx:24-46`, `src/App.tsx:104`.
- **What is wrong:** Atomic's sort control and `atomic-results-per-page` both hide when a search fails or has no results. Our page-size control always renders.
- **Failure:** "Show 12" stays on the screen during an error and on the no-results page, where it has no effect. With the facets gone, the empty facets column pushes the error illustration off center. Both can be seen at `/#q=9999` and after CR-01.
- **Direction to discuss:** read the search status in the component, or reconsider Atomic's component. Atomic's control brings the correct states for free but renders as radio buttons, so the design would need a decision. The empty column belongs with PC-76.

#### CR-09: A missing setting produces a blank page

- **Severity:** Low. **Status:** Confirmed from the code.
- **Where:** `src/config.ts:14-16`, `src/main.tsx:17`.
- **What is wrong:** `readCoveoConfig` throws during the first render, and the application has no error boundary.
- **Failure:** if a hosting build (PC-30) is missing a variable, visitors see an empty page, with the reason only in the browser console.
- **Direction to discuss:** whether to fail the build when these values are missing. That catches the mistake before deployment and is simpler than an error screen.

### 4. Over-engineering

#### CR-10: Badge text color is calculated at runtime from a fixed table

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/pokemonTypes.ts:29-40, 48-71`.
- **What is wrong:** eleven constants and four functions implement the WCAG contrast formula to choose between two ink colors. Unknown Types fall back to `Normal`, so the input is always one of the 18 colors in the table, and each result is the same on every run. `POKEMON_TYPES` and the export of `contrastRatio` exist only for tests.
- **Failure:** no incorrect result. The cost is code that a reviewer must read and defend for an answer that never changes.
- **Direction to discuss:** store the ink color next to each Type color and keep the contrast check in the test only. The tradeoff is that a new color would need its ink chosen by hand, but the existing test would catch a bad choice.

#### CR-11: The whole stylesheet is shipped twice

- **Severity:** Low. **Status:** Confirmed from the build output.
- **Where:** `src/search/useShadowStyles.ts:2`, `src/main.tsx:3`.
- **What is wrong:** `theme.css` is loaded as the page stylesheet and again as a string inside the JavaScript bundle, for adoption into result cards. The built stylesheet is about 33 KB. Result cards need only a small part of it, because rules such as `:root`, `body` and the Atomic layout overrides do nothing inside a card.
- **Failure:** no incorrect result. It adds download weight to a bundle already noted as large in `docs/handoff.md`.
- **Direction to discuss:** whether a separate small stylesheet for cards is worth it. Measure in PC-43 first, since the performance rule requires a baseline.
- **Measured on November 8, 2026, for PC-43.** The built stylesheet is 34,208 bytes, or 7,754 bytes gzipped. The JavaScript bundle is 1,460,028 bytes, or 390,233 bytes gzipped. The inline copy of `theme.css` is 51,615 bytes of that bundle, and removing it would save 9,569 gzipped bytes, about 2.5% of the gzipped bundle. No change was made. The decision belongs with the PC-43 baseline.

### 5. Low reuse

#### CR-12: Coveo field names are repeated across files

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/settings.ts:24, 27`, `src/search/PokemonResult.tsx:10-16, 54-55, 68, 71`, `src/App.tsx:78, 85`.
- **What is wrong:** `pokemon_number` has a named constant, but the same text also appears in `POKEMON_RESULT_FIELDS`. The names `pokemon_name`, `pokemon_type` and `pokemon_generation` are written out in several files. The project rules ask for each configuration value to be defined once.
- **Failure:** renaming a field means finding every copy. A missed copy gives an empty card value or a failed sort, with no compile error.
- **Direction to discuss:** one set of named fields in `settings.ts`, also used to build the sort values for CR-01.

#### CR-13: Search settings are repeated or live outside `settings.ts`

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/queryRewrite.ts:4-5`, `src/App.tsx:100`, `src/search/engine.ts:5`, `src/search/PokemonResult.tsx:42`.
- **What is wrong:**
  - The regular expression's `{1,4}` silently repeats `POKEDEX_NUMBER_WIDTH`.
  - `relevancy` is written in both `App.tsx` and `queryRewrite.ts`, and the home page rule depends on them matching.
  - `SEARCH_HUB` lives in `engine.ts`, although the project rule places shared settings in `settings.ts`.
  - The `???` placeholder is a bare string with no name.
- **Failure:** changing the Pokédex width in one place makes lookups and padding disagree, with no error.
- **Direction to discuss:** move these into named settings, and derive the regular expression from the width.

#### CR-14: Design values are repeated, and some depend on each other silently

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/theme.css:55, 84, 129-134, 150, 160-161, 182, 205-206, 221-222`, `src/search/PokemonResult.tsx:45, 62, 78`, `src/search/ResultsPerPage.tsx:25, 33`, `src/search/PokedexLookupNotice.tsx:22`, `src/search/pokemonTypes.ts:22-23, 79`.
- **What is wrong:**
  - The radii `20px` and `12px`, `2px solid var(--border)`, the `5px` card edge and the `13px` and `15px` text sizes are repeated across CSS and TSX.
  - `#1e2230` and `#ffffff` appear in both `theme.css` and `pokemonTypes.ts`.
  - `--size-search-row: 67px` is the 60-pixel search box height plus its 2-pixel and 5-pixel borders, but nothing states or derives this.
  - The `1024px` breakpoint must match Atomic's default mobile breakpoint, and that dependency is unstated.
- **Failure:** changing the search box border changes the real height but not the reserved row, which brings back the layout jump that this value fixed.
- **Direction to discuss:** named tokens in `theme.css`, with Tailwind classes using them. The search row is worth deriving from its parts.

#### CR-15: Tests repeat configured values

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/engine.test.ts:13, 16`, `src/search/queryRewrite.test.ts:28, 35`, `src/search/PokemonResult.test.tsx:42, 48, 66-75`.
- **What is wrong:** the project rule says tests read shared settings or check behavior. These tests write out the search hub, field name and image path. `engine.test.ts:16` and `PokemonResult.test.tsx:66-75` compare a constant with itself, so they can never find a mistake.
- **Failure:** an intended change to a setting fails these tests, while a real mistake passes them.
- **Direction to discuss:** remove the two tautological checks, and have the rest read shared settings.

### 6. Bad logic

#### CR-16: "Best match" on the home page is really Pokédex order

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** `src/search/queryRewrite.ts:25-27`.
- **What is wrong:** the hook rewrites `relevancy` to Pokédex order whenever the query is empty, so it cannot tell the default from a deliberate choice. The change exists only in the outgoing request, so Headless state and the dropdown still say `relevancy`.
- **Failure:** with the CR-01 fix applied in the browser, choosing Best match on the home page sent `@pokemon_number ascending`. Best match and Pokédex number are the same on that page, and the dropdown describes something other than what is on screen.
- **Direction to discuss:** this comes from the recorded home page decision, which the user should revisit once sorting works. One option is to start the dropdown on Pokédex number for an empty query and let relevancy apply only to text searches. The tradeoff is more state logic against a truthful label.

#### CR-17: Number-only searches may reach analytics as empty queries

- **Severity:** Medium. **Status:** Plausible. The request is confirmed, but the effect inside Coveo is not.
- **Where:** `src/search/queryRewrite.ts:21-23`, `docs/architecture.md:334`.
- **What is wrong:** `docs/architecture.md` states that analytics keep the text the person typed. For `/#q=3`, the only search signal observed was the Search API request itself, with `q: ""`, `analytics.capture: true`, and no separate event carrying the text. The request also carries no `trackingId`.
- **Documentation:** the Search API reference says `capture` controls "whether the search api call should be tracked for analytics and machine learning purposes", and that a Search event's `queryText` should be set to the `q` value of the query ([Search API reference](https://docs.coveo.com/en/13)).
- **Our inference:** Coveo probably records these lookups with empty text, which would make them invisible to Query Suggestions and reporting.
- **Failure if correct:** number searches appear as empty queries in analytics, and the statement in the architecture document is wrong.
- **Direction to discuss:** check a lookup in Usage Analytics during PC-50, when the search hub is verified. Then either correct the document or choose a lookup method that keeps the query text. Coveo's documented advanced query action does not clear `q`, which was the original reason for using the hook, so this tradeoff should be reopened with the evidence. Whether a tracking ID is needed should be checked at the same time.
- **Documentation check, November 8, 2026.** [Log search events](https://docs.coveo.com/en/1502/) states that `queryText` must be the same as the `q` value of the search request. The [Search API reference](https://docs.coveo.com/en/13/) states that `capture` makes the search call tracked for analytics and machine learning, and its analytics parameters have no field for separate query text. Our inference: a number lookup, which sends `q: ""`, is recorded with empty query text, so the statement in `docs/architecture.md` that analytics keep the typed text is probably wrong. Coveo does not document this exact case. **Check in Usage Analytics:** search for `25` in the application, then view that event in the **Visit Browser**, or in a report with the **User Query** dimension filtered to the `pokebowl-search` hub. If it shows `25`, the statement stands and nothing changes. If it is blank, correct the statement and decide whether lookups need to appear in reports. Query Suggestions is not affected, because number lookups are not useful suggestions. No code change is justified by the documentation alone.

#### CR-18: Tests mock away the behavior they claim to cover

- **Severity:** Medium. **Status:** Confirmed.
- **Where:** `src/App.test.tsx:10-41, 97-104`, `e2e/search.spec.ts:207-213`, `src/search/showAllWhenCleared.test.ts:5-9`, `src/search/queryRewrite.ts:35-50`.
- **What is wrong:**
  - `App.test.tsx` replaces all of Atomic, so it mostly proves that JSX contains its children.
  - "Sorts results by name" skips the sort control.
  - The `showAllWhenCleared` test asserts the two dispatches the code makes, so it could not reveal CR-02.
  - `preprocessSearchRequest`, which decides which requests are rewritten and handles parsing errors, has no unit test.
- **Failure:** 76 unit tests passed while two of the three sort options were broken, and the handoff recorded sorting as working.
- **Direction to discuss:** cover each interactive control with one browser test that uses the control itself. Add tests for the hook's request filtering. Browser tests do not yet run in CI, so the eval key (Stream B in the handoff) is what would let them block merges.
- **Update.** `App.test.tsx` now keeps only checks of our markup and of the configuration passed to Atomic. Tests that only proved JSX contains its children were removed. Browser tests now also cover the search button, the pager and the breadbox, in `e2e/search-box.spec.ts`, so each interactive control is exercised through the control itself.

#### CR-19: A query of only spaces is not treated as empty

- **Severity:** Low. **Status:** Confirmed.
- **Where:** `src/search/queryRewrite.ts:20, 25`.
- **What is wrong:** `parsePokedexNumber` trims the query, but the home page check uses `!body.q` without trimming.
- **Failure:** submitting spaces sends `q: "   "` with `relevancy`. It returns all 1,028 items in arbitrary order, starting with a Pokémon that has no number, instead of Pokédex order.
- **Direction to discuss:** treat blank text the same as empty in one shared check.

## Areas that are sound

- **Subscriptions and cleanup:** `App.tsx`, `ResultsPerPage.tsx` and `PokedexLookupNotice.tsx` all unsubscribe correctly.
- **The clear handler's re-entrancy:** dispatching from inside the subscriber is safe, and each clear produced exactly one search.
- **Shared links:** a link such as `/#q=charizard` is not wiped by the clear handler, because Headless restores the query and the search box text in one action.
- **Request hook scope:** it applies only to search requests, and on failure it logs the error and sends the original request.
- **Pokédex order:** zero-padded strings sort correctly, and Pokémon with `???` come last.
- **Configuration and keys:** environment values are read only through `config.ts` and `main.tsx`, and only a search key reaches the browser.
- **Dependencies:** a single copy of `@coveo/headless` is installed, so the application and Atomic share one engine implementation.
- **`reconstruct_body.py`:** it affects only the indexed body text, and no effect on application behavior was found.

## Not verified

- The Pokédex number and Name A to Z fix was checked only by changing the compiled module in the browser, at one window width (1440 pixels). It still needs a real change and a check at the desired widths.
- The effect of CR-17 inside Coveo was not checked, because Usage Analytics and the Coveo console were not used.
- CR-04 was reproduced with an artificial 900 ms delay. How often it happens at real response times was not measured.
- The Atomic reference page for `atomic-sort-expression` redirects to a script-rendered page that could not be read as text. The installed package's type documentation for Atomic 3.65.0 was used instead.
- pokemondb.net was blocked during testing, so real artwork loading and following a result link were not tested.
- The browser test suite was not run, to avoid adding search traffic to analytics. The 76 unit tests pass.
- The order of the Pokémon that share `???` as their number was not checked for stability between requests.
- The checks ran on a development server. A production build was not exercised.
