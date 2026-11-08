# Session Handoff

Last updated: November 8, 2026 at 4:22 PM EST. Update this file, including the time, before ending a work session.

## Read first

1. `AGENTS.md`: working rules
2. `docs/plan.md`: tickets and acceptance criteria
3. `docs/architecture.md`: decisions and reasoning
4. `configs/coveo/`: what is applied in Coveo
5. `docs/indexing-expected-results.md`: expected index values

## Current state

The work is compressed into two days, as sequenced in `docs/plan.md`. Target completion is Friday, November 13, 2026, and the user aims to finish almost everything sooner.

| Area | State |
|---|---|
| Git | `feature/indexing` is pushed at `aa880ab`, with authors rewritten to one identity. `feature/search-app` branches from it and its work is uncommitted. PR #1 is merged and no indexing PR is open. Local branch `backup/indexing-before-author-fix` keeps the old commits. |
| Epic 0, Foundation | Complete except PC-02 and one PC-05 item |
| Epic 1, Indexing | PC-14 is open while `pokemondb-pokemon` rebuilds. Everything else is complete. |
| Epic 2, Search application | PC-20, PC-21 and PC-22 are complete. PC-23 still needs a search case. |
| Query routing | Dedicated `pokebowl-search` pipeline, condition Search Hub contains `pokebowl-`, filtered to `pokemondb-pokemon` and verified at 1,028 results. No Coveo project was created; it is optional. |
| Epic 6, Generated answers | The PC-60 body review passed on six sample Pokémon |
| Everything else | Not started |

## Next actions

1. **Finish PC-14 when the rebuild ends.** The first full crawl left the 12 detail fields empty because `performFieldMappingUsingAllOrigins` was not set on the live source. It is now set. Check through the search API with `maximumAge: 0` that all detail fields are populated and match `docs/indexing-expected-results.md`. Ask the user for source errors and `pre-reconstruct-body` usage statistics, then tick PC-14.
2. **Open the indexing PR**, which is the first CI run of the Python tests, when the user asks. The search-app PR follows it.
3. **Associate all models and Query Suggestions with the `pokebowl-search` pipeline, not `default`.** The eval search hub must contain `pokebowl-`.
4. **Next tickets:** PC-40 eval reference data, PC-70 detail page, PC-30 hosting, then PC-61 models and PC-50 analytics.

## Small open items

- **PC-02:** the user will email Will Tseng on the Technical Challenge thread with the organization ID, asking to enable Passage Retrieval. Do not remind the user about this.
- **PC-05:** tick the failing-test item the first time a test fails in CI.
- **Browser tests in CI:** `npm run test:e2e` needs the Coveo values, so it does not run in CI yet.
- **Dependency audit:** `npm audit` reports 9 high and 1 low findings, all through Coveo's packages. They are not overridden, because that could break the SDK. Check whether they are reachable from the app.
- **Bundle size:** the JavaScript is 1.28 MB, or 347 KB gzipped. Measure its effect in PC-43.
- **Styling:** result images are oversized and the page is unstyled. Handle this with PC-70.
- **Optional:** branch protection on `main`, set by the user in GitHub, so failed checks block merges.
- **Parked:** Knowledge Hub access. It is an early-access beta and is not visible in the user's console. It could be requested in the PC-02 email.

## Things to remember

**Coveo behavior we confirmed**

- The source's crawling rules offered only exclusions, so we use one exclusion regex with **Include all non-excluded pages** on.
- Scraped metadata fills same-named fields only with `performFieldMappingUsingAllOrigins` set to `true` on the source.
- A pending **Metadata discovery** job is harmless. It only feeds the sample-based **View and map metadata** list.
- Item JSON from **Content Browser** shows existing fields but not body text. Use **quick view** for the body.
- `transactionid` in item JSON increases with each new build.
- Settings recorded in `configs/` are not proof of what is live. Both the mapping parameter and the Facet option on `pokemon_generation` were recorded but missing in Coveo during the first full crawl.
- The Facet option needed no rebuild, but the Search API kept serving a cached empty facet for a while. Use `maximumAge: 0` to verify a change.
- The browser key returns no test source items on any search hub, which suggests the key enforces its search hub. A second key is needed to query the test source or to run evals.
- Coveo's API explorer can run requests while signed in, with no admin key. Multi-value fields created through the API need `"multiValueFacetTokenizers": ";"`.

**For upcoming tickets**

- **PC-70:** new Pokémon have `???` as their number and empty stats. All stats are strings.
- **PC-50:** Query Suggestions needs at least 100 analytics events, and Test configuration mode is only for sandbox organizations. Eval traffic needs its own search hub so it does not affect analytics.
- **PC-60 and PC-61:** generated answers use only the body field. RGA and Semantic Encoder models must use the same content and the same query pipeline, and must be limited to `pokemondb-pokemon`, because `pokemondb-test-charizard` is being kept and the pipeline filter may not cover model building.
- **PC-81 idea:** Coveo's Hosted MCP Server could expose the index to an AI agent. Its Answer tool requires Knowledge Hub, but Search and Fetch do not.
- Body text still has repeated Pokédex entries and game labels such as "Let's Go Pikachu". We keep them unless PC-42 or PC-44 shows a problem, and any fix belongs in the extension.

**Tools**

- Use Node 24 (`fnm use`). On Node 26, npm silently installs an old Atomic release.
- Python tests: `.venv/bin/pytest configs/coveo/extensions`. App tests: `npm test`. Browser tests: `npm run test:e2e`.
- Rerail runs on edits. Manual scan: `rerail scan --repo . --scope repository --pack python --pack complexity --path <path> --json --no-send`. The 18 `bandit-b101-assert-used` results in the test file are expected.
- Sample pages from the earlier session were temporary. Re-fetch them when needed, one page every 2 seconds, and keep raw HTML out of Git.

## How the user wants to work

- Discuss decisions and tradeoffs first, and keep discussion at the level the user is working at.
- Read the relevant Coveo documentation in full before giving platform steps or diagnosing a failure. Never have the user repeat steps to test a guess.
- Cite Coveo documentation for tradeoffs, and separate what it states from our own reasoning.
- Mark every action the user must take with 🟡, and give exact steps, values and expected results.
- Prefer a Coveo API over repeated console steps, and record the API used.
- Keep `docs/plan.md` and all docs current as work finishes.
- Commit and push only when asked. Never add Claude attribution.
