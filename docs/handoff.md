# Session Handoff

Last updated: November 8, 2026 at 6:38 PM EST. Update this file, including the time, before ending a work session.

## Read first

1. `AGENTS.md`: working rules, including web standards and architecture
2. `docs/plan.md`: tickets and acceptance criteria
3. `docs/architecture.md`: decisions and reasoning
4. `configs/coveo/`: what is applied in Coveo
5. `docs/indexing-expected-results.md`: expected index values

## Current state

The target is to finish almost everything quickly, with Friday, November 13, 2026 as the outer limit. `docs/plan.md` holds the status against the assessment requirements and all tickets.

| Area | State |
|---|---|
| Git | PRs #1 to #4 are merged, and their branches are deleted. This handoff is on `docs/next-work-handoff`. Merge that branch, or start from it, before new work. |
| Assessment tiers | Essential is complete. Intermediate, Advanced and Bonus are not. |
| Index | PC-14 is verified at 1,028 items, with all fields populated. The body review (PC-60) passed. |
| Query routing | Dedicated `pokebowl-search` pipeline, condition Search Hub contains `pokebowl-`, filtered to `pokemondb-pokemon`. No Coveo project was created; it is optional. |
| Search interface | Results, Type and Generation facets, sort control, page sizes, pager, query correction, Pokédex lookup for number-only searches and Pokédex order on the home page all work. Tailwind and shadcn/ui are in place. |
| Tests | 76 unit, 20 browser and 11 Python tests pass. Browser tests run locally only. |
| Rerail | No repository rules were added, by the user's decision. |

There are two streams of remaining work. Stream A is for subagents and is **on hold until the user releases it**. Stream B needs the user, because it involves the Coveo console, Vercel or the user's own judgment.

## Stream A: subagent work, in priority order

Do not launch any of these until the user says so. The user may release them one at a time.

| Priority | Ticket | Goal | Branch | Ready? |
|---|---|---|---|---|
| 1 | PC-70 | Pokémon detail page, a remaining Advanced requirement | `feature/detail-page` | Confirm the page content with the user first |
| 2 | PC-83 | Passage Retrieval point of view, the minimum for the Bonus | `feature/passage-retrieval-pov` | Yes |
| 3 | PC-40, PC-41 | Eval reference data and index quality checks | `feature/evals` | Yes |
| 4 | PC-76 | Designed loading, no-results and error states | `feature/ui-states` | Yes |
| 5 | PC-42 | Relevance evals | `feature/evals` | Needs the eval API key from Stream B |
| 6 | PC-62, then PC-77 | Generated answers in the application, in the same design | `feature/generated-answers` | Needs the models from Stream B |
| Any time | Rerail fixes | Fix findings from a scan, for review afterwards | `chore/rerail-fixes` | When a scan has agreed fixes |

**PC-70 proposed content, not yet confirmed by the user:** artwork, name, number, Types, Generation, species, height, weight, abilities and all stats, built with shadcn/ui, with a shareable URL for each Pokémon and a clear not-found state. New Pokémon have `???` as their number and no stats. An exact lookup with `@pokemon_name=="Mr. Mime"` returns one item.

**PC-83 output:** a document that explains how the Passage Retrieval API works, when to use it instead of Search or RGA, and how we would use it in future work. Cite Coveo documentation, and separate what it states from our own view. Passage Retrieval is not yet enabled, so do not claim to have tested it. A concept for PC-81 is the Hosted MCP idea listed below.

**PC-40 limits:** fetch at most one pokemondb.net page every 2 seconds, and keep raw HTML out of Git.

**Every subagent must:**

- Work in its own git worktree and branch, starting from an up-to-date `main`.
- Use Node 24 through `fnm`, run `npm ci`, and follow `AGENTS.md`, including test-first development and no Claude attribution.
- Have the main session's `.env` linked into its worktree, without committing it, if it runs browser tests.
- Use its own dev server port for browser tests. `playwright.config.ts` is fixed to port 5173 and reuses a running server, so a test in a worktree could otherwise run against another checkout. Make the port configurable the first time this is needed.
- Check interface work in a real browser with screenshots.
- Leave `docs/plan.md` and `docs/handoff.md` to the main session, and report which boxes to tick.
- Not change Coveo configuration, and tell the user about any major change to `configs/coveo/extensions/reconstruct_body.py`.
- Not commit or push unless the user has asked for that work to be committed.

## Stream B: work with the user

Read the relevant Coveo or Vercel documentation in full before giving steps. Mark each user action with 🟡.

| Priority | Ticket | Work | Notes |
|---|---|---|---|
| 1 | PC-61 | Create the Semantic Encoder and RGA models | Associate both with `pokebowl-search`, limit content to `pokemondb-pokemon`, and keep a record in `configs/coveo/`. Builds run in the background. |
| 2 | PC-50 | Choose and run the analytics preload | Needs at least 100 events. Verify the search hub on analytics events, which has not been checked yet. |
| 3 | PC-51 | Build Query Suggestions and show type-ahead | Associate with `pokebowl-search`. |
| 4 | PC-30 | Host on Vercel | Set `VITE_COVEO_ORGANIZATION_ID` and `VITE_COVEO_SEARCH_API_KEY` as build variables, use Node 24 and deploy on merge. The free plan is limited to non-commercial personal use, and Vercel can pause projects, so check the link before the panel. |
| 5 | PC-31 | Check history for secrets, then share the repository | Merged commits still carry an older local email. PR #1 keeps its old commits. |
| 6 | Eval key | Create a second API key with a search hub containing `pokebowl-`, for example `pokebowl-evals` | Unblocks PC-42 and browser tests in CI. Record it in `configs/coveo/api-keys.json`, without its value. |
| 7 | PC-02, PC-80 | Passage Retrieval access and setup | The user sends the organization ID to Coveo when ready. |
| 8 | PC-63, PC-44 | Tune answers and add answer evals | After generated answers work. |
| 9 | PC-43 | Performance baseline | After hosting. |
| Last | PC-90, PC-91, PC-100 to PC-103 | Configuration export, final docs and presentations | The user chooses the enterprise customer for PC-102. Plan for 45 minutes including questions. Any skipped tier item needs a justification. |

## Recent decisions

Number-only searches are Pokédex lookups, the home page is in Pokédex order, page sizes stay at 12, 24, 48 and 96, and query correction and a sort control are added. Hosting is on Vercel. Phone layouts are out of scope. See `docs/architecture.md` for the reasoning, including why the request hook is used for lookups.

**Questions the panel may ask:** automatic mapping is on although Coveo advises keeping it off for native sources; the request hook is used although Coveo recommends an advanced query action for `aq`; some Atomic layout overrides use `!important`. Each has a recorded reason.

## Small open items

- **PC-02:** the user will email Will Tseng on the Technical Challenge thread with the organization ID, asking to enable Passage Retrieval. Do not remind the user about this.
- **PC-05:** tick the failing-test item the first time a test fails in CI.
- **Browser tests in CI:** `npm run test:e2e` needs the Coveo values, so it does not run in CI yet.
- **Dependency audit:** `npm audit` reports 9 high and 1 low findings, all through Coveo's packages. They are not overridden, because that could break the SDK. Check whether they are reachable from the app.
- **Layout jump:** fixed. Cumulative layout shift fell from 0.444 to about 0.02 on a production build, by reserving the search row. PC-43 still needs the full baseline.
- **Extension health:** check `pre-reconstruct-body` usage statistics, because a timeout silently indexes an item without the rewrite.
- **Analytics hub:** the hub on analytics events has not been verified. Check it in PC-50.
- **Bundle size:** the JavaScript is 1.53 MB, or 421 KB gzipped, after adding shadcn/ui. Measure its effect in PC-43.
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
- The browser key enforces the `pokebowl-search` hub in Coveo, so other hubs sent by a client still route there. A second key is needed to query the test source or to run evals.
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
- Rerail runs on edits. Manual scan: `rerail scan --repo . --scope repository --json --no-send`, reading the `violations` list. Generated files in `src/components/ui` have style findings and stay as generated. Imports starting with `@/` are flagged as missing but resolve correctly.
- To verify Coveo directly, run a Node script outside the repository with `node --env-file=.env`, and send `maximumAge: 0`. Never print the key.
- The shell is zsh, so a command held in a variable does not split into words, and `timeout` is not installed.
- Sample pages from the earlier session were temporary. Re-fetch them when needed, one page every 2 seconds, and keep raw HTML out of Git.

## How the user wants to work

- Discuss decisions and tradeoffs first, and keep discussion at the level the user is working at.
- Read the relevant Coveo documentation in full before giving platform steps or diagnosing a failure. Never have the user repeat steps to test a guess.
- Cite Coveo documentation for tradeoffs, and separate what it states from our own reasoning.
- Mark every action the user must take with 🟡, and give exact steps, values and expected results.
- Prefer a Coveo API over repeated console steps, and record the API used.
- Keep `docs/plan.md` and all docs current as work finishes.
- Commit and push only when asked. Never add Claude attribution.
- Merge pull requests with **Create a merge commit**. Delete a branch only after confirming it is on `main`.
- Do not quote hour or day estimates. Order work by dependency, and name only real waits such as crawls and model builds.
- Ask before choosing product behavior, such as option lists, defaults and result order.
- Check interface changes in a real browser before reporting them as done.
- Hand Rerail scan fixes to subagents, so the user can keep working and review afterwards. Other subagent work waits for the user's release.
- Do not remind the user about the PC-02 email.
