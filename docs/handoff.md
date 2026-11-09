# Session Handoff

Last updated: November 9, 2026 at 8:53 AM EST. Update this file, including the time, before ending a work session.

## Read first

1. `AGENTS.md`: working rules
2. `docs/plan.md`: tickets, status and acceptance criteria
3. `docs/architecture.md`: decisions and reasoning
4. `configs/coveo/`: what is applied in Coveo
5. `docs/indexing-expected-results.md`: expected index values

Finished reports are in `docs/archive/`. Open items from them are in this file and the plan.

## Current state

The target is Friday, November 13, 2026.

| Area | State |
|---|---|
| Git | **PR #6 is open:** `integration/overnight` into `main`. It contains the review fixes, detail page, generated answers, evals, suggestions generator and Passage Retrieval document, so no other PR is needed. |
| Uncommitted on `integration/overnight` | The detail page link rewording, its tests, and the documentation reconciliation with this archive. Commit and push only when the user asks. |
| Assessment | Essential is done. Generated answers, Query Suggestions and the detail page are built in PR #6. Hosting, sharing the repository and the presentations remain. |
| Coveo | Index verified at 1,028 items. `pokebowl-search` pipeline has the Semantic Encoder, RGA and Query Suggestions models, all recorded in `configs/coveo/ml-models.json`. |
| Query Suggestions | The live file has equal importance. The ranked file in `configs/coveo/` needs uploading and a build. |
| Tests | Last full run on `integration/overnight`: 186 unit, 117 browser and 11 Python tests passed. The link rewording then brought unit tests to 187, with 8 of 8 detail browser tests passing. Browser tests run locally only and use a stubbed answer stream. |

**To run the application:** check out `integration/overnight`, run `fnm use`, `npm ci` and `npm run dev`, and open http://localhost:5173/. A local `.env` must hold the two values listed in `.env.example`. A detail page opens at a URL such as http://localhost:5173/?pokemon=Charizard.

## Next steps

Read the relevant Coveo or Vercel documentation in full before giving steps, and mark each user action with 🟡.

| Order | Work | Who | Notes |
|---|---|---|---|
| 1 | Upload the ranked suggestions file (PC-50) | 🟡 User | Advanced Model Configurations `PUT configs/{configurationType}`, `DEFAULT_QUERIES`, `en`. The daily build picks it up |
| 2 | Merge PR #6 | 🟡 User | Use **Create a merge commit** |
| 3 | Partial-name search (PC-52) | Both | Waiting on the user's go-ahead for research |
| 4 | Pokémon links in generated answers (PC-64) | Both | Waiting on the user's choice of approach |
| 5 | Host on Vercel (PC-30), then share the repository (PC-31) | 🟡 User, guided | Set the two Coveo values as build variables and use Node 24. The free plan is for non-commercial use and projects can pause, so check the link before the panel. Merged commits still carry an older local email |
| 6 | Create the eval key | 🟡 User, guided | Search hub containing `pokebowl-`, such as `pokebowl-evals`. Unblocks PC-42, PC-44 and browser tests in CI. Record it in `configs/coveo/api-keys.json` without its value |
| 7 | Relevance and answer evals, tuning (PC-42, PC-44, PC-63) | Both | Needs the eval key |
| 8 | Performance baseline (PC-43) | Agent | After hosting |
| Last | PC-78, PC-90, PC-91, PC-100 to PC-103 | Both | The user chooses the enterprise customer for PC-102. Plan for 45 minutes including questions. Any skipped tier item needs a justification |

Passage Retrieval hands-on work (PC-80 to PC-82) depends on Coveo enabling access. The Hosted MCP idea is a concept only and is not planned work.

## Open decisions for the user

- The interface questions listed under PC-78.
- Whether to restructure Atomic layout overrides (PC-79).
- Whether an answer disappearing on a non-relevance sort is acceptable (PC-63).
- Which detail page enhancements to make. A UI/UX ideation report was in progress when this was written.
- `npm audit`: the recommendation below.

## Open checks

- **Number lookups in analytics:** search `25`, then check in **Visit Browser** whether the event shows `25` or blank. This also confirms the search hub on analytics events. If blank, correct `docs/architecture.md`.
- **PC-40:** 11 difficult pages need checking by hand.
- **PC-05:** tick the failing-test item the first time a test fails in CI.
- **Extension health:** check `pre-reconstruct-body` usage statistics, because a timeout silently indexes an item without the rewrite.
- **Optional:** branch protection on `main`, set by the user in GitHub.
- **Parked:** Knowledge Hub access, an early-access beta not visible in the user's console.

## Known limits

- Text typed right after the clear button, before the search returns, can be replaced, because Headless copies the executed query into the search box. No public option prevents it.
- An arriving generated answer moves the cards down, because the page cannot know in advance whether an answer will exist.
- Searching `char` returns few results until PC-52 is done.
- With the Semantic Encoder active, a nonsense text query can still return results.
- Body text has repeated Pokédex entries and game labels such as "Let's Go Pikachu". Any fix belongs in the extension.
- **Questions the panel may ask:** automatic mapping is on although Coveo advises keeping it off for native sources; the request hook is used although Coveo recommends an advanced query action for `aq`; some Atomic layout overrides use `!important`. Each has a recorded reason.

**Dependency audit:** `npm audit` reports 9 high and 1 low finding, all through Coveo's packages, and npm offers no fix. They reduce to one `zod` advisory and two `i18next-http-backend` advisories. None is reachable in our use: the first needs a generated answer `agentId`, and we set none; the others need a language or namespace value an attacker controls. Recommendation, for the user to decide: no overrides, update when Coveo releases new packages, and repeat the check if an `agentId` is added.

## Things to remember

**Coveo behavior we confirmed**

- The source's crawling rules offered only exclusions, so we use one exclusion regex with **Include all non-excluded pages** on.
- Scraped metadata fills same-named fields only with `performFieldMappingUsingAllOrigins` set to `true` on the source.
- A pending **Metadata discovery** job is harmless. It only feeds the sample-based **View and map metadata** list.
- Item JSON from **Content Browser** shows existing fields but not body text. Use **quick view** for the body.
- `transactionid` in item JSON increases with each new build.
- Settings recorded in `configs/` are not proof of what is live. Both the mapping parameter and the Facet option on `pokemon_generation` were recorded but missing in Coveo during the first full crawl.
- The Facet option needed no rebuild, but the Search API kept serving a cached empty facet for a while. Use `maximumAge: 0` to verify a change.
- The browser key enforces the `pokebowl-search` hub in Coveo, so other hubs sent by a client still route there. A second key is needed to query the test source or to run evals.
- Coveo's API explorer can run requests while signed in, with no admin key. Multi-value fields created through the API need `"multiValueFacetTokenizers": ";"`.

**Facts for upcoming tickets**

- New Pokémon have `???` as their number and empty stats. All stats are strings.
- A Query Suggestions model needs approximately 10,000 search events to learn suggestions. Eval traffic needs a separate search hub.
- RGA and Semantic Encoder models use the same content and are limited to `pokemondb-pokemon`, because `pokemondb-test-charizard` is kept.
- Fetch at most one pokemondb.net page every 2 seconds, and keep raw HTML out of Git.

**Tools**

- Use Node 24 (`fnm use`). On Node 26, npm silently installs an old Atomic release.
- Python tests: `.venv/bin/pytest configs/coveo/extensions`. App tests: `npm test`. Browser tests: `npm run test:e2e`.
- Rerail runs on edits. Manual scan: `rerail scan --repo . --scope repository --json --no-send`, reading the `violations` list. Generated files in `src/components/ui` have style findings and stay as generated. Imports starting with `@/` are flagged as missing but resolve correctly.
- To verify Coveo directly, run a Node script outside the repository with `node --env-file=.env`, and send `maximumAge: 0`. Never print the key.
- The shell is zsh, so a command held in a variable does not split into words, and `timeout` is not installed.
- Sample pages from the earlier session were temporary. Re-fetch them when needed, one page every 2 seconds, and keep raw HTML out of Git.

**Background agents**

- Use a separate git worktree and dev server port (`E2E_PORT`), with the main `.env` linked and not committed.
- Follow `AGENTS.md`, including test-first development, real-browser checks and no Claude attribution.
- Do not change Coveo, and do not commit or push unless the user asked for it.

## How the user wants to work

- Discuss decisions and tradeoffs first, and keep discussion at the level the user is working at.
- Do the documented best practice first. Enrichment comes after it, and the docs note how the work would go further in production.
- Read the relevant Coveo documentation in full before giving platform steps or diagnosing a failure. Never have the user repeat steps to test a guess.
- Cite Coveo documentation for tradeoffs, and separate what it states from our reasoning.
- Mark every action the user must take with 🟡, and give exact steps, values and expected results.
- Prefer a Coveo API over repeated console steps, and record the API used.
- Keep `docs/plan.md` and all docs current as work finishes.
- Commit and push only when asked. Never add Claude attribution.
- Write directly, such as "our settings". Do not write "our own X" or "X's own Y".
- Merge pull requests with **Create a merge commit**. Delete a branch only after confirming it is on `main`.
- Do not quote hour or day estimates. Order work by dependency, and name only real waits such as crawls and model builds.
- Ask before choosing product behavior, such as option lists, defaults and result order.
- Check interface changes in a real browser before reporting them as done.
- Hand Rerail scan fixes and agreed implementation work to background agents, so the user can keep working. Do not start work the user has not agreed.
- Do not remind the user about the PC-02 email.

## Known flaky test

`e2e/interface.spec.ts`, the search page loading test, fails intermittently in full parallel runs and passes alone. The cause is not confirmed. Its error was not captured, so capture it the next time it fails.
