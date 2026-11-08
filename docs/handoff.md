# Session Handoff

Last updated: November 8, 2026 at 3:25 PM EST. Update this file, including the time, before ending a work session.

## Read first

1. `AGENTS.md`: working rules
2. `docs/plan.md`: tickets and acceptance criteria
3. `docs/architecture.md`: decisions and reasoning
4. `configs/coveo/`: what is applied in Coveo
5. `docs/indexing-expected-results.md`: expected index values

## Current state

| Area | State |
|---|---|
| Git | Work is on `feature/indexing`, pushed at `56efae4` or later. PR #1 (foundation) is merged. No indexing PR is open yet. |
| Epic 0, Foundation | Complete except PC-02, one PC-03 item and one PC-05 item, listed below |
| Epic 1, Indexing | PC-10 to PC-13 and PC-15 are complete. **PC-14, the full crawl, is running in Coveo.** |
| Everything else | Not started |

Target completion is Friday, November 13, 2026. Actual time has been about 45% to 65% of the plan's estimates.

## Next actions

1. **Finish PC-14.** Ask the user for the build result of `pokemondb-pokemon`:
   - The item count, which must be exactly 1,028. It covers 1,025 numbered Pokémon plus `browt`, `gecqua` and `pombon`.
   - Any errors or warnings on the source
   - The item JSON for `rotom` or `mr-mime`, compared with `docs/indexing-expected-results.md`
   - Usage statistics for the `pre-reconstruct-body` extension: errors, skips and timeouts
2. **After verification:** the user deletes `pokemondb-test-charizard`, so Charizard does not appear twice in results. Tick PC-14, then open the indexing PR. That PR is the first CI run of the Python tests.
3. **Start `feature/search-app` (PC-20 to PC-22).** Read Coveo's Atomic and API key documentation first, then guide the user through creating a search-only key. The user stores it in `.env` as `VITE_COVEO_SEARCH_API_KEY`, with `VITE_COVEO_ORGANIZATION_ID`. Never ask for these in chat.
4. **PC-40 can run in parallel:** the eval reference data pull.

## Small open items

- **PC-02:** the user emails Will Tseng on the Technical Challenge email thread with the organization ID, asking to enable Passage Retrieval. Planned for Monday, November 9.
- **PC-03:** `readCoveoConfig` in `src/config.ts` is tested but not used until PC-20.
- **PC-05:** tick the failing-test item the first time a test fails in CI.
- **Optional:** branch protection on `main`, set by the user in GitHub, so failed checks block merges.
- **Parked:** Knowledge Hub access. It is an early-access beta and is not visible in the user's console. It could be requested in the PC-02 email.

## Things to remember

**Coveo behavior we confirmed**

- The source's crawling rules offered only exclusions, so we use one exclusion regex with **Include all non-excluded pages** on.
- Scraped metadata fills same-named fields only with `performFieldMappingUsingAllOrigins` set to `true` on the source.
- A pending **Metadata discovery** job is harmless. It only feeds the sample-based **View and map metadata** list.
- Item JSON from **Content Browser** shows existing fields but not body text. Use **quick view** for the body.
- `transactionid` in item JSON increases with each new build.
- Coveo's API explorer can run requests while signed in, with no admin key. Multi-value fields created through the API need `"multiValueFacetTokenizers": ";"`.

**For upcoming tickets**

- **PC-22:** Generation values sort as text, so `Generation 10` lands after `Generation 1`. Set a suitable facet order and confirm the option in the Atomic documentation.
- **PC-21:** use `pokemon_name`, because the page title has extra text.
- **PC-70:** new Pokémon have `???` as their number and empty stats. All stats are strings.
- **PC-50:** Query Suggestions needs at least 100 analytics events, and Test configuration mode is only for sandbox organizations. Eval traffic needs its own search hub so it does not affect analytics.
- **PC-60 and PC-61:** generated answers use only the body field. RGA and Semantic Encoder models must use the same content and the same query pipeline.
- **PC-81 idea:** Coveo's Hosted MCP Server could expose the index to an AI agent. Its Answer tool requires Knowledge Hub, but Search and Fetch do not.
- Body text still has repeated Pokédex entries and game labels such as "Let's Go Pikachu". We keep them unless PC-42 or PC-44 shows a problem, and any fix belongs in the extension.

**Tools**

- Python tests: `.venv/bin/pytest configs/coveo/extensions`. App tests: `npm test`.
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
