# Project Plan

## Goal

Build a Pokémon search application on the Coveo platform. The content comes from the individual Pokémon pages on pokemondb.net. Users can search, filter by Type and Generation, see each Pokémon's picture, read AI-generated answers, get type-ahead suggestions and open a detail page for a single Pokémon.

The finished work is presented to a panel of Coveo experts in a 45-minute session that covers what we built, how Coveo is configured, why we made our choices and what the solution is worth to a real enterprise customer.

**Target completion:** Friday, November 13, 2026.

## Status against the assessment requirements

The assessment defines four tiers of required work and a panel presentation. A tier item may be skipped only with a justification.

| Tier | Requirement | Status | Tickets |
|---|---|---|---|
| Essential | Access the Coveo organization | Done | |
| Essential | Install Atomic or Headless locally | Done | PC-20 |
| Essential | Index only the individual Pokémon pages | Done, 1,028 items verified | PC-14 |
| Essential | Connect the local search page to Coveo | Done | PC-20 |
| Essential | Filter by Pokémon Type | Done | PC-22 |
| Essential | Filter by Pokémon Generation | Done | PC-22 |
| Essential | Show each Pokémon's picture in results | Done | PC-21 |
| Intermediate | Host the code on GitHub and share the link | Code is on GitHub; not yet shared | PC-31 |
| Intermediate | Host the search application | Done: https://pokebowl-cove.vercel.app/ | PC-30 |
| Advanced | Generative answers with Relevance Generative Answering | Built and live. The body text fix for answers that mixed Pokémon forms is merged (PR #14) and the full source is rebuilt. A custom prompt instruction for answer style (version 3) and evolution sentences are live since 2026-11-10. Answer evals: 38 of 45, with the open failures documented | PC-61, PC-62, PC-63, PC-44 |
| Advanced | Preload a Query Suggestions model for type-ahead | Done: model active and the ranked default queries are live. After the rebuild, Pokémon names lead the suggestions | PC-50, PC-51 |
| Advanced | Pokémon detail page | Done, live on the hosted site | PC-70 |
| Advanced | Technical deep dive presentation | Deck, speaker notes and demo plan ready; rehearsal remains | PC-100 |
| Advanced | Enterprise customer value presentation | Ready in the deck | PC-102 |
| Bonus | Passage Retrieval: at minimum, understand it and hold a point of view | Done: point of view written (`docs/passage-retrieval.md`). Building with it is optional | PC-80 to PC-83 |

Evals, performance baselines and interface polish are additions we chose and are not assessment requirements. They support the presentation.

## How we work

- Work is organized into epics and tickets. Each epic has a separate branch and is tracked through one or more pull requests. Epics 4 to 8 were combined on one integration branch and merged through PR #6.
- A ticket is done when all of its acceptance criteria are checked.
- Tests or expected results are defined before implementation.
- The user makes all Coveo platform changes, with guidance from the agent.

**Owners:** *You* is the user, *Agent* is the coding agent and *Both* means the work is done together.

## Sequence

Work with a waiting time, such as Coveo's response or a model build, starts as early as it can.

| Order | Tickets | Notes |
|---|---|---|
| Done | PC-01, PC-03, PC-04, PC-10 to PC-15, PC-20 to PC-23, PC-30, PC-40, PC-41, PC-50 to PC-52, PC-60 to PC-62, PC-70, PC-75, PC-76, PC-83 | Index, search application, models, detail page and generated answers. Items after PC-23 are in PR #6 |
| Now | See Remaining work | The ordered list of everything left |


---

## Remaining work

Only what the assessment or the panel demo needs. Everything else is listed under Not doing, with the reason.

### 1. Correct generated answer content (full source rebuilt)

Answers gave Mega Charizard X's 110.5 kg as Charizard's weight, because each form's data table in the indexed body had no form name. PR #14 rewrites those rows as named sentences, adds the Pokémon's name to form labels, and adds "is weak to" sentences.

- [x] Extension change built test-first, with answer eval questions that catch another form's values (PR #14)
- [x] 🟡 User pastes the new extension into Coveo, rebuilds the single-Pokémon test source, and checks that Charizard's body names each form and that all 16 fields still populate (done 2026-11-09: all 10 required sentences and all 16 fields present)
- [x] 🟡 User rebuilds the full source (1,028 items) (done 2026-11-09). The user reports the RGA and Semantic Encoder models did not need a manual rebuild; the answer evals check this
- [x] Answer evals run after the rebuild and show the base-form facts are right. **Done 2026-11-10 with prompt version 2: all 7 base-form cases pass, 37 of 40 overall (33 of 40 with the stricter grader added later that day).** Earlier result: run on 2026-11-09 after the source rebuild, only 3 of the 7 base-form cases passed** (33 of 40 overall, 32 of 40 with the wrong-weakness check added on 2026-11-10). Charizard's weight still comes back as 110.5 kg (Mega Charizard X), Venusaur's weight and height as Mega Venusaur's, and Lucario's height as Mega Lucario's. The indexed body is correct ("Charizard weighs 90.5 kg", each Mega form in its own sentence), so our inference is that the RGA and Semantic Encoder models still hold the old body text. "Is Charizard weak to water?" still gets no answer. See `docs/evaluation.md`
- [x] Both models pick up the new body text, then the answer evals are re-run. **RGA done 2026-11-10 (38 of 45).** The Semantic Encoder cannot be rebuilt by hand, its Edit JSON schedule is read-only, and its next weekly build (about 2026-11-15) falls after submission. User decision (2026-11-10): no run after it; the results are a snapshot, and the production plan runs the answer evals after every model rebuild to detect drift (`docs/evaluation.md`)
- Problem found by the same run: the `weakness-charizard` answer also lists Grass and Bug as 4x weaknesses, which Charizard resists. **Grader fixed (2026-11-10):** the case now fails when a resisted or immune type, from `evals/reference/form-facts.json`, is claimed as a weakness. The answer is correct in the 2026-11-10 run with prompt version 2
- Side effect found by the same run: bare Type searches such as `flying` and `ground` lost precision (P@12 0.931 to 0.875 in the partial-name benchmark), because the body now states each matchup twice. Relevance MRR is unchanged at 0.947. **Decision (user, 2026-11-10): accept.** The first result is a Pokémon of that Type for all 18 Type searches, which is what the user requires. The cost is lower precision on the first page for some Types, lowest for `flying` (6 of 12) and `ground` (7 of 12)

### 2. Interface fixes

- [x] Feedback buttons always shown on generated answers, including the detail page bubble. Atomic shows them only once a long answer is expanded with Show more; there is no option to change this
- [x] Long answers in the detail page bubble use Atomic's Show more
- [x] Shorter number lookup notice
- [x] Only the two Coveo values reach the browser bundle, not Vercel's build values
- [x] Atomic layout overrides reduced to what Atomic documents: all five `!important` rules removed, one documented exception kept (PC-79)

### 2a. Generated answer loading state and answer style (raised 2026-11-09, decided 2026-11-10)

**Problem: nothing shows while an answer is being prepared.** `atomic-generated-answer` in Atomic 3.65 renders nothing until the first answer text or citation arrives (`hasNoAnswerGenerated` in `atomic-generated-answer.js`). First text takes about 2 seconds at p50, so the results appear, then the answer card appears and pushes them down. Atomic's `is-generating` label only exists inside a card that is already showing, and is hidden. Headless exposes `isLoading` and `isStreaming` in the generated answer state, so a placeholder can be driven from it.

- [x] User decides when the placeholder shows (every text search, or question-style searches only) and how it looks. Decided on 2026-11-10: every text search where Coveo starts an answer, driven by the Headless answer state
- [x] Placeholder built test-first and checked in a real browser at 1100, 1440, 1920 and 2560 px. Every measured text search, including `char`, `fire` and nonsense, starts an answer stream. Real answers showed the placeholder for 1.6 to 2.0 s, replaced by the card at the same position. Searches with no answer show it for about 60 to 85 ms (65 ms, 5 frames on `char`). Headless reports neither `isLoading` nor `isStreaming` for about 620 ms in some waits, so the rule also uses the stream ID (see `docs/architecture.md`, Generated answers)
- [x] Flash on searches with no answer fixed. Decided on 2026-11-10: the placeholder shows only after Coveo's stream header has arrived, plus a 75 ms pause (`ANSWER_PLACEHOLDER_PAUSE_MS`), and opens with a 200 ms height and fade animation (none under reduced motion); it still hides at once. A fixed 200 ms delay was tried first and failed on `what is the strongest water`, whose no-answer stream ended 363 ms after the results. No-answer streams end within 13 to 16 ms of their header, real answers send their first text 1.2 to 1.5 s after it. The answer card still opens taller than the placeholder, a known and accepted second jump (see `docs/architecture.md`, Generated answers)

**Problem: answers read as data dumps, not summaries.** In the November 9 report, 24 of 25 answers start with a Markdown heading, 10 refer to "the documentation", and "What is the difference between Charmander and Charmeleon?" lists every field of both pages. Headless 3.58 no longer has the `answerStyle` option; the only client format setting is plain text or Markdown. Coveo documents a custom prompt instruction on the RGA model (up to 2,000 characters, added to the base prompt, triggers a rebuild, not guaranteed to be followed, not covered by Coveo's tests) ([Create and manage RGA models](https://docs.coveo.com/en/nb6a0085/), [Improve your RGA implementation](https://docs.coveo.com/en/p5db0550/)).

- [x] User agrees the intended answer style and the prompt instruction text: a short direct summary, then relevant details, with headings for multi-part answers, grounded only in the cited content, keeping the template's accuracy and safety rules (`configs/coveo/rga-prompt-instruction.txt`)
- [x] Style checks added to the answer eval (length, no "documentation" wording, no wrong weaknesses) and applied to the 2026-11-09 report as the baseline before the prompt (`evals/reports/answers-baseline-2026-11-09.json`, done 2026-11-10). Headings are allowed for multi-part answers. Regraded result: 32 of 40, because the Charizard weakness answer now fails for listing Grass and Bug; 0 of 32 answers start with a direct sentence, 15 refer to the documentation, 5 are over 200 words
- [x] 🟡 User adds the instruction in the console (done 2026-11-10; this started the RGA rebuild)
- [x] Answer evals re-run once the RGA model is Active with prompt version 2 and compared case by case with the baseline (2026-11-10: 37 of 40, was 32; 6 cases fixed, 1 broken; see `docs/evaluation.md`).
- [x] Evolution questions got no answer because the evolution chart was indexed as a flattened list. Fixed in PR #18: the extension writes one sentence per evolution step (see `docs/architecture.md`, Evolution sentences). Test source checked by the user on 2026-11-10
- [x] "What species is Eevee?" was answered without the species. Prompt version 3 asks the first sentence to answer exactly what was asked (PR #18)
- [x] 🟡 Full source rebuild and RGA rebuild with prompt version 3 (done 2026-11-10). The Search API shows the evolution sentences on exactly each family's pages and no flattened chart. Answer evals: 38 of 45 (see `docs/evaluation.md`)
- [x] Grader made stricter (2026-11-10): the opening of a direct answer must give the expected fact, after an answer that opened with "Charmander evolves into Charizard." passed on its details. Detail page evolution question added for Charizard, Pikachu and Mewtwo; Raichu's page accepted as a citation for the Alolan Raichu step. Earlier reports regraded: baseline 31 of 40, version 2 33 of 40
- [x] User decision (2026-11-10): the remaining answer failures are documented as next iterations for production feedback, not fixed before the demo: species given after the opening (Charizard, Pikachu, Eevee, Gengar), the reverse question "Which Pokémon evolves into Charizard?", no answer for "Describe how Mewtwo evolves", and no answer for "Is Charizard weak to water?"

### 3. Wrap-up

- [x] User looks through the live site at the usual window widths (PC-78; done 2026-11-12, screenshots skipped by the user)
- [ ] Optional, only if time allows before submission: phone layouts (user, 2026-11-11). Not a presentation topic
- [x] Final documentation and README (PC-91, 2026-11-10)
- [x] Technical deep dive and demo script, using the talking points below (PC-100; deck and demo plan done 2026-11-12)
- [x] Production evaluation approach (PC-101; in the deck, 2026-11-12)
- [ ] Demo rehearsed
- [x] ~~Performance re-measured on a quiet network~~ Dropped by the user on 2026-11-10: the 2026-11-09 runs were already made on a quiet network. Every p50 matched the baseline; the p95 misses stay documented (see `docs/architecture.md`, Performance)
- [x] Business case, started only after the technical work (Epic 11; in the deck, 2026-11-12)
- [x] Coveo configuration exported with the Coveo CLI, at the very end (PC-90; 2026-11-12, `configs/coveo/export/`)
- [ ] Materials submitted, then the repository shared (PC-103, PC-31)

### Decisions made

- Search box stays centered; sort and page size stay visible for small result sets; filters and search are not pinned on long pages.
- Suggestions on an empty search box: yes, and already live.
- Bare Type searches keep the doubled matchup sentences: the first result is the right Type for every Type, and first-page precision dropped for some (2026-11-10).
- Answer style comes from a custom RGA prompt instruction: a direct summary first, relevant details after, headings for multi-part answers, and only cited content (2026-11-10).
- The answer prompt stays at version 3. The remaining answer failures, including the soft fail on "Which Pokémon evolves into Charizard?", are future work with candidate changes recorded in `docs/evaluation.md` (2026-11-10).
- Detail page is complete for the demo: no close-match suggestions on the not-found page, no search box, no evolution line, stat percentiles or Type matchups.
- An answer disappearing when sorting away from Best match is accepted, because Coveo documents this behaviour.
- `char` showing "Did you mean: chart" is accepted. It predates the partial-name change, and turning correction off would also remove corrections for real typos.
- The order of names matching a prefix comes from Coveo's relevance score and is accepted, because there is no real traffic to rank popular Pokémon higher.
- `npm audit` findings in Coveo's packages are left until Coveo releases new packages.
- Nonsense queries that land near a Pokémon in vector space return results. Accepted as a tuning tradeoff for a system that is not yet in production.
- Two fake answer events reached analytics during an automated check (`answerId` `72f54f33-6af6-4960-9336-c7078ef976c7`). Exclude this answer if answer reports are shown.

### Not doing

Considered and dropped, because neither the assessment nor the demo needs them. Each can be a talking point instead.

| Item | Reason |
|---|---|
| Improving descriptive queries such as `water turtle` (MRR 0.700) | Tuning work with no real queries to tune against. Explained as a tradeoff instead |
| Linking Pokémon names in answers to detail pages (PC-64) | Not required, and Coveo does not guarantee a prompt instruction is followed |
| General answer tuning and RGA reporting (PC-63) | The body text fix covers the visible errors; reporting needs real traffic |
| Answers drawn from the "Changes" section | Not needed for the demo. Evolution answers were fixed with the evolution sentences |
| Further prompt iterations for the open answer failures | Each costs an RGA rebuild and is not guaranteed to hold; with no real users there is no feedback to prioritise them. Documented in `docs/evaluation.md` as next iterations |
| Grader fixes for the Gengar ability and Mewtwo Type cases | The grader checks facts are present; the cases are known and documented |
| Hands-on Passage Retrieval (PC-80 to PC-82) | Optional bonus; the written point of view covers it |
| Answer rating stretch goal (PC-S1) | Covered by the feedback buttons in the interface fixes |
| Console checks of the `25` search event and card clicks | Talking points about analytics, not demo needs |
| Browser tests in CI, branch protection and a failing-test check | Production practice |
| Screen reader and non-Chromium browser testing | Production practice |
| The small layout shift on load (0.033, within its 0.05 target) and a separate card stylesheet | Gains too small to matter |
| The header logo label and the duplicate icon file | Not visible in the demo |
| Showing feedback buttons while a long answer is collapsed | Atomic has no option for it; raising `max-collapsed-height` would only collapse fewer answers |

### Talking points for the panel

**What we built and why.** A Sitemap source limited to individual Pokémon pages, web scraping into 16 fields, and a Python pre-conversion extension that rewrites tables as sentences so search and generated answers can use them. A dedicated `pokebowl-search` pipeline reached through the search hub. Atomic React with Type and Generation facets, type-ahead, generated answers and a detail page, hosted on Vercel. Evals for index quality, relevance, answers and performance.

**Tradeoffs to be ready to explain**

- The request hook sets `aq`, `dq` and `wildcards` per request, although Coveo recommends the advanced query action for `aq`, because the values depend on the typed text in the same request.
- Partial names use a `$qre` boost of 300, above Coveo's typical range, chosen by benchmark. Facet values are repeated in `dq` so filters still apply to prefix matches.
- The Semantic Encoder threshold stays at 0.8, so some nonsense queries return near matches, because raising it would drop relevant descriptive results.
- Query Suggestions start from a default queries file built from index values, the method Coveo documents for low-traffic environments, and the importance values rank categories, not real popularity.
- Generated answers depend on clean body text: the form mix-up came from tables, and a fix needs a source rebuild and model rebuilds. The Semantic Encoder cannot be rebuilt by hand; it rebuilds weekly.
- Answer style is set by a custom RGA prompt instruction, because the client answer style option no longer exists. Coveo does not guarantee the instruction is followed and does not test it, so the answer evals check it. Version 3 did not move the species into the opening, which shows that limit.
- The answer grader was made stricter when it passed a wrong opening sentence, and older reports were regraded, so the score went down rather than hiding the error (38 of 45).
- The answer placeholder is driven only by Coveo's Headless state, because Atomic shows nothing until the first answer text arrives. Every text search starts an answer, so a short delay keeps searches without an answer from flashing it.
- Overall MRR is 0.947 against a 0.95 target, unchanged after the rebuild; the gap is descriptive queries (0.700).
- Automatic field mapping is on, and a few Atomic layout overrides remain, each with a recorded reason.

**Where this goes in production, with real users and data**

Confirm each Coveo capability against current Coveo documentation before presenting it.

- **Learn from behaviour.** Real queries and clicks replace the synthetic default queries file in Query Suggestions, and allow Automatic Relevance Tuning to boost what people actually choose. This needs search hubs and analytics set up per interface, which the application already sends.
- **Tune with evidence.** Use real query logs and a labelled set that includes negative queries to tune the Semantic Encoder threshold, the partial-name boost and descriptive queries, and A/B test pipeline changes before rolling them out.
- **Close the loop on answers.** Feedback buttons and RGA reporting show which answers fail. Sampled answers are reviewed by a person, and failing questions are added to the answer evals.
- **Run evals over time.** Index, relevance, answer and performance evals run on a schedule and in CI, with alerts when a score drops, so a content or configuration change cannot quietly break answers. Answer evals also run after every weekly model rebuild, because Coveo states the RGA base prompt changes often.
- **Manage configuration as code.** The Coveo CLI exports the organization configuration, so changes are reviewed and promoted between a test and a production organization.
- **Keep content fresh and structured.** Schedule recrawls as pokemondb.net changes, or move to the Push API with structured data, which would also remove the table-parsing risk behind the answer fix.
- **Secure access per user.** Use search tokens issued by a backend instead of a shared search-only API key once there are signed-in users.
- **Extend to agents.** Passage Retrieval or Coveo's Hosted MCP Server could ground an AI assistant in the same index (see `docs/passage-retrieval.md`).

---

## Epic 0: Foundation

**Branch:** `feature/foundation`

### PC-01: Add repository skeleton

Owner: Agent

- [x] `.gitignore` excludes secrets, dependencies and build output
- [x] `.env.example` lists required variables without values

### PC-03: Scaffold the application

Owner: Agent

- [x] React, TypeScript and Vite application runs locally
- [x] Coveo values load from local environment variables

### PC-04: Add test tooling

Owner: Agent · Depends on: PC-03

- [x] Vitest and React Testing Library run with `npm test`
- [x] One sample test proves the setup works

### PC-05: Add continuous integration

Owner: Agent · Depends on: PC-04

- [x] GitHub Actions runs tests and the build on every pull request

---

## Epic 1: Indexing

**Branch:** `feature/indexing`

### PC-10: Decide the indexing approach

Owner: Both

- [x] Source type chosen: Web, Sitemap or Push
- [x] Handling of alternate forms, such as Mega Evolutions, chosen
- [x] Method for extracting Generation chosen
- [x] Decisions and rejected alternatives recorded in `docs/architecture.md`

### PC-11: Define expected index results

Owner: Both · Depends on: PC-10

- [x] Expected title, Type, Generation and image written down for a few Pokémon, including Charizard, whose Mega form has a different Type (see `docs/indexing-expected-results.md`)
- [x] List of URLs that must not be indexed, such as moves and list pages

### PC-12: Create a single-Pokémon test source

Owner: You, guided by Agent · Depends on: PC-10

This source lets us test configuration without waiting for a full crawl.

- [x] Source indexes exactly one Pokémon page
- [x] The item is visible in the Coveo console

### PC-13: Configure extraction, fields and mappings

Owner: You, guided by Agent · Depends on: PC-11, PC-12

- [x] Web scraping configuration applied to the test source
- [x] Page clutter is removed from the indexed body
- [x] Type, Generation and image fields are populated
- [x] Detail-page fields are populated
- [x] Results match PC-11, and the final configuration is documented

### PC-15: Reconstruct readable body text

Owner: Both · Depends on: PC-13

Type effectiveness grids and stat tables lose their meaning when flattened into text. A pre-conversion indexing pipeline extension rewrites them as sentences so they are useful to search and generated answers.

- [x] Extension built test-first and verified on saved sample pages
- [x] Extension added in Coveo and applied to the test source
- [x] Charizard's body contains the rewritten sentences and all 16 fields still populate

### PC-14: Run and verify the full crawl

Owner: You, guided by Agent · Depends on: PC-13, PC-15

The crawl stays within the site's requested rate of one page every 2 seconds.

- [x] Only individual Pokémon pages are indexed
- [x] Item count is 1,028: 1,025 numbered Pokémon and 3 new Generation 10 Pokémon without numbers
- [x] A sample of items matches the expected field values

---

## Epic 2: Search application

**Branch:** `feature/search-app`

### PC-20: Connect the application to Coveo

Owner: Both · Depends on: PC-03, PC-12

- [x] Search-only API key created and stored locally
- [x] Atomic search interface returns results from our organization

### PC-21: Display results with pictures

Owner: Agent · Depends on: PC-13, PC-20

- [x] Each result shows the Pokémon's name and picture
- [x] A missing image does not break the result

### PC-22: Add Type and Generation facets

Owner: Agent · Depends on: PC-13, PC-20

- [x] Type facet filters results correctly
- [x] Generation facet filters results correctly

### PC-23: Add browser tests for search

Owner: Agent · Depends on: PC-21, PC-22

- [x] Playwright covers searching, filtering and viewing a result

---

## Epic 3: Hosting and sharing

**Branch:** `feature/hosting`

### PC-30: Host the application

Owner: Both · Depends on: PC-21

- [x] Hosting provider chosen and recorded in `docs/architecture.md`
- [x] Application is publicly reachable and returns results, at https://pokebowl-cove.vercel.app/
- [x] Merges deploy automatically

### PC-31: Share the repository with Coveo

Owner: You · Depends on: PC-30, PC-100, PC-101, PC-102

This is part of the final submission. The repository stays private until the presentations and demo are prepared.

- [x] History and files checked for secrets
- [ ] Repository made public or reviewers invited
- [ ] Repository link sent to Coveo

---

## Epic 4: Evals and performance

**Branch:** `feature/evals`, with finished work combined in one integration branch (PR #6)

Evals run on demand with `npm run eval`. The index quality check turns analytics capture off, so its traffic does not affect the analytics used for model training. Relevance and answer evals also query the `pokebowl-search` search hub, which the browser key enforces, with analytics capture off.

### PC-40: Create eval reference data

Owner: Both

- [x] Script pulls 30 to 50 sample pages at the site's requested rate
- [x] Expected values are saved as JSON and raw HTML stays out of Git
- [x] Difficult cases are verified by hand. 5 match `docs/indexing-expected-results.md`. The user compared most of the other 11 on our live detail pages against pokemondb.net, found no differences, and closed the item on 2026-11-09

  The eval compares Coveo's index with values our script read from pokemondb.net, so a script error on a difficult page would pass unnoticed. A person confirms the script's values by opening each page. The list of difficult pages is `DIFFICULT_PAGES` in `evals/buildReference.ts`; confirmed pages go into `evals/reference/hand-verified.json` and `docs/indexing-expected-results.md`. Check the name, number, Types, Generation and that the artwork matches:

  | Page | Number | Types | Generation |
  |---|---|---|---|
  | [Gecqua](https://pokemondb.net/pokedex/gecqua) | ??? | Water | 10 |
  | [Pombon](https://pokemondb.net/pokedex/pombon) | ??? | Fire | 10 |
  | [Farfetch'd](https://pokemondb.net/pokedex/farfetchd) | 0083 | Normal, Flying | 1 |
  | [Nidoran♀ (female)](https://pokemondb.net/pokedex/nidoran-f) | 0029 | Poison | 1 |
  | [Ho-oh](https://pokemondb.net/pokedex/ho-oh) | 0250 | Fire, Flying | 2 |
  | [Type: Null](https://pokemondb.net/pokedex/type-null) | 0772 | Normal | 7 |
  | [Flabébé](https://pokemondb.net/pokedex/flabebe) | 0669 | Fairy | 6 |
  | [Deoxys](https://pokemondb.net/pokedex/deoxys) | 0386 | Psychic | 3 |
  | [Wormadam](https://pokemondb.net/pokedex/wormadam) | 0413 | Bug, Grass | 4 |
  | [Urshifu](https://pokemondb.net/pokedex/urshifu) | 0892 | Fighting, Dark | 8 |
  | [Zygarde](https://pokemondb.net/pokedex/zygarde) | 0718 | Dragon, Ground | 6 |

### PC-41: Add index quality checks

Owner: Agent · Depends on: PC-14, PC-40

- [x] Indexed Type, Generation and image values are compared with reference data
- [x] The run reports any non-Pokémon pages in the index

### PC-42: Add relevance evals

Owner: Both · Depends on: PC-14

- [x] Labelled query set created
- [x] Recall@K and MRR are reported

### PC-43: Establish the performance baseline

Owner: Agent · Depends on: PC-30

- [x] p50 and p95 latency recorded for search, type-ahead, answers and page load
- [x] Performance targets set from the baseline
- [x] Reports saved as JSON

These are pre-hosting numbers from one local network, in `evals/reports/performance.json`. Measure again from the hosted application. The numbers did not support the sort cache, a page size limit, pipeline simplification or tuning answer settings for speed.
- [x] Bundle size reviewed, including whether a smaller stylesheet for cards is worthwhile (the inline copy is about 2.5% of the gzipped JavaScript)

### PC-44: Add generated answer evals

Owner: Both · Depends on: PC-62

- [x] Questions cover expected facts, citations and unanswerable cases
- [x] Results are saved in a report

---

## Epic 5: Query Suggestions

**Branch:** `feature/query-suggestions`, with finished work combined in one integration branch (PR #6)

### PC-50: Pre-populate suggestions

Owner: Both · Depends on: PC-20, and the model from PC-51

The application has no real users, so the model has no search history to learn from. Coveo's documented method for a low-traffic environment is a default queries file. See `docs/architecture.md`, section Query Suggestions.

- [x] Preload approach chosen and recorded
- [x] Contents of the default queries file confirmed by the user
- [x] File generated from index values and uploaded to the model
- [x] Ranked file (2,236 queries with category importance) uploaded, and a model build has picked it up
- [x] Scripted fallback not needed: the model became active

### PC-51: Build the model and enable type-ahead

Owner: Both · Depends on: PC-20

The model is created first, because the default queries file attaches to an existing model.

- [x] Model is active and associated with the query pipeline
- [x] Search box shows useful suggestions for partial queries, checked in a real browser

### PC-52: Improve results for partial names

Owner: Both · Depends on: PC-14

Searching `char` returns only 5 items, with Charizard last and Charmander missing, because `char` is not a whole word in most names. A ranking expression rule can only reorder what a query already returns, so finding partial names needs a separate method.

**Decision.** The change is code only, with no Coveo configuration change. For one-word searches of two or more letters or digits, the request hook keeps `q` unchanged and adds `wildcards: true`, `dq: @pokemon_name=<q>*` and a `$qre` boost of 300 in `aq`. A benchmark of nine settings chose 300, the lowest setting that reaches the best score on every measure. A boost of 100, the first research recommendation, gave a perfect MRR but left `char` in a mixed order. Sending `char*` as `q` was rejected, because it matched all 1,028 items and changes the text sent to RGA. See `docs/architecture.md`.

**Facet decision.** Names matched through `dq` were not filtered by a selected facet, so `char` with Type Fire showed Charjabug. Selected facet values are added to `dq`, because a filter must always filter and `char` with Type Fire must still find Charmander. Dropping `dq` when a facet is selected would lose Charmander, and accepting the defect would leave a visibly broken filter.

**Targets at boost 300, measured without facets from a developer machine:**

| Target | Measured | Met |
|---|---|---|
| Partial MRR at least 0.95 | 1.00 | Yes |
| Partial Recall@12 of 1.00 | 1.00 | Yes |
| No category below baseline | None below | Yes |
| Search p95 within 250 ms | 190 ms | Yes |
| Overall MRR at least 0.95 | 0.947 | No |

The overall target is not met. The gap is in descriptive, Generation, ability and species queries, which one-word prefix matching does not improve.

- [x] Coveo's documented options for prefix matching and name boosts read in full, with a recommendation prepared
- [x] The user approves the recommendation
- [x] Expected results defined for partial-name queries
- [x] Facet selections filter names matched through `dq`, checked in a real browser
- [x] Change applied in the request hook and documented in `docs/architecture.md`, with no change needed in `configs/coveo/`
- [x] Expected results verified against live data

---

## Epic 6: Generated answers

**Branch:** `feature/generated-answers`, with finished work combined in one integration branch (PR #6)

### PC-60: Confirm content quality

Owner: Both · Depends on: PC-14

Generated answers use only an item's body text, so that text must be clean and meaningful.

- [x] Sample item bodies reviewed
- [x] Extraction adjusted if needed (no change was needed)

### PC-61: Create and associate the models

Owner: You, guided by Agent · Depends on: PC-60

- [x] Semantic Encoder and Relevance Generative Answering (RGA) models use the same content, limited to the full source
- [x] Both models are associated with the `pokebowl-search` query pipeline

### PC-62: Add generated answers to the application

Owner: Agent · Depends on: PC-61

- [x] Answers and citations display for suitable queries
- [x] Search still works when no answer is generated

### PC-65: Ask about this Pokémon on the detail page

Owner: Agent · Depends on: PC-62, PC-70

An animated Pokéball at the top-right corner of the detail page's main card opens a compact speech bubble with suggested questions. Picking one replaces the questions with an answer about that Pokémon, generated only then, and only one thing shows at a time. Coveo documents RGA in a custom interface, and that answers regenerate when results are filtered. Combining these to scope an answer to one item is our inference, checked on seven real questions across six Pokémon.

- [x] Answers cite only the Pokémon shown, checked on a small question set
- [x] No answer is generated on page load
- [x] Citations, disclaimer and feedback match the search page
- [x] Waiting, no-answer and failed states are handled in the bubble
- [x] The bubble opens to the left of a Pokéball visible on load at the card corner, overlays the page without pushing content, stays on screen at each width, and stays closed on load

### PC-63: Tune answers and add reporting

Owner: Both · Depends on: PC-62

- Not doing: RGA reporting is configured
- Not doing: Configuration is tuned using PC-44 results
- [x] User decides whether an answer disappearing on a non-relevance sort is acceptable (accepted; Coveo documents this behavior)

### PC-64: Link Pokémon names in generated answers to detail pages

Owner: Both · Depends on: PC-62

Pokémon mentioned in an answer should link to our detail page, while citations keep linking to pokemondb.net. Atomic has no option to customize how answer text renders. The proposed first approach is a custom prompt instruction that asks for Markdown links. Coveo states such an instruction is not guaranteed to be followed. The alternative is rendering the answer with Headless.

- [x] Approach agreed by the user: try it
- Not doing: Links tested on a small question set, including that relative links render
- Not doing: Citations still link to pokemondb.net

---

## Epic 7: Detail page

**Branch:** `feature/detail-page`, with finished work combined in one integration branch (PR #6)

### PC-70: Build the Pokémon detail page

Owner: Agent · Depends on: PC-21

- [x] Data shown on the page agreed
- [x] Each result links to a page with a shareable URL
- [x] Components are built test-first using shadcn/ui and Tailwind
- [x] Unknown Pokémon show a clear not-found state
- [x] New Pokémon with unknown numbers or empty stats display cleanly
- [x] Pokédex entries from the stored page are shown, with a credit to the source
- [x] Type and Generation link to the filtered search page

---

## Epic 7a: Interface design and polish

**Branch:** `feature/ui-polish`, with finished work combined in one integration branch (PR #6)

The application is shown live to a panel, so it needs a deliberate, finished design beyond Atomic's default look. Atomic components are styled through theme variables and CSS parts.

### PC-75: Agree the visual direction

Owner: Both · Depends on: PC-22

- [x] Layout, colour, type and tone agreed before styling starts
- [x] Direction recorded in `docs/architecture.md`

### PC-76: Polish the search page

Owner: Agent · Depends on: PC-75

- [x] Header and page layout are designed, with no browser default styling
- [x] Result cards have consistent, correctly sized pictures and show name, number, Type and Generation
- [x] Type is shown with clear visual badges
- [x] Facets, search box, summary and pagination match the design
- [x] Loading, no-results and error states are designed
- [x] Layout works on desktop window widths, with every row of results filled (phone optimization dropped at the user's request)

### PC-79: Move custom interface code to Tailwind and shadcn/ui

The move to one centered column with Atomic's `horizontal-facets` section removed the page grid overrides from audit finding UI-14. A few `!important` rules remain for the search box section and status row.

Owner: Agent · Depends on: PC-76

Tailwind and shadcn/ui are the approved tools for our interface code. Atomic components stay on Atomic theme variables and CSS parts, because Atomic uses Shadow DOM.

- [x] Header, result cards and Type badges use Tailwind and shadcn/ui; page sizes now use Atomic's control
- [x] Result cards render correctly inside Atomic's Shadow DOM
- [x] Overrides of Atomic's page layout are reduced to what the documentation supports (all `!important` rules removed; the filter popover margin rule is kept, with its reason in `docs/architecture.md`)
- [x] Browser tests and a visual check pass at desktop widths

### PC-77: Polish the remaining experiences

Owner: Agent · Depends on: PC-75, PC-62, PC-70

- [x] Generated answers, type-ahead and the detail page match the search page design
- Not doing: The bonus feature matches the design, if it is built

### PC-78: Review quality across the application

Owner: Both · Depends on: PC-76, PC-77

- [x] Reviewed in a real browser by the user (2026-11-12; screenshots skipped by the user)
- [x] Keyboard use, focus states, colour contrast and image alt text checked (automated, on the hosted site at 1100, 1440, 1920 and 2560 px; no defects found)
- [x] Page load is measured against PC-43 so polish does not harm performance (hosted measurement, PC-43)
- [x] User decided the open interface questions (see Decisions made under Remaining work)

---

## Epic 8: Passage Retrieval bonus

**Branch:** `feature/passage-retrieval`

The Passage Retrieval API returns ranked text passages from indexed content, mainly to ground large language model responses.

### PC-80: Set up Passage Retrieval

Owner: You, guided by Agent · Depends on: PC-61

- Not doing: Passage Retrieval model created and associated with the query pipeline
- Not doing: A test API call returns relevant passages

### PC-81: Choose the feature concept

Owner: Both · Depends on: PC-80

- Not doing: Concept agreed and recorded in `docs/architecture.md`

### PC-82: Build the feature

Owner: Agent · Depends on: PC-81

- Not doing: Feature is built test-first and works in the hosted application
- Not doing: Credentials are not exposed beyond what is safe for the browser

### PC-83: Write a point of view on Passage Retrieval

Owner: Both

This is the minimum outcome for the bonus.

- [x] Documented how the API works and when to use it
- [x] Documented how we would use it in future work

---

## Epic 9: Configuration and documentation

**Branch:** `feature/docs-and-config`

### PC-90: Export the Coveo configuration

Owner: Both · Depends on: PC-14, PC-61

- [x] Configuration exported to the repository with the Coveo CLI (2026-11-12, `configs/coveo/export/`)
- [x] No secrets appear in the export (no sensitive parameters, keys or tokens; API keys and the Semantic Encoder and RGA models are not snapshot resources, see `configs/coveo/README.md`)

### PC-91: Finish the documentation

Owner: Agent · Depends on: PC-90

- [x] `docs/architecture.md` reflects the final configuration and decisions
- [x] README explains how to set up, run, test and evaluate the project

---

## Epic 10: Technical presentation

**Branch:** `feature/presentation`, if materials are stored in the repository

### PC-100: Prepare the technical deep dive and demo

Owner: Both · Depends on: PC-44, PC-91

- [x] Covers what we built, the Coveo configuration, architecture choices and lessons learned
- [x] Includes eval results
- [ ] Demo has been rehearsed

### PC-101: Prepare the production evaluation approach

Owner: Both

- [x] Explains evals over time, end-user feedback, sampling and A/B testing, using Coveo's tools where possible. Notes and sources: `docs/evaluation.md`

### PC-103: Submit the presentation materials

Owner: You · Depends on: PC-100, PC-101, PC-102

- [ ] Materials submitted before the session

---

## Epic 11: Business case

**Done in the presentation deck (2026-11-12).** All business case and enterprise customer work belongs here and starts only after the application and technical work are done.

### PC-102: Develop the customer business case

Owner: You, supported by Agent

- [x] Enterprise customer chosen from past or present experience
- [x] Solution and value proposition prepared for that customer

---

## Stretch goals

### PC-S1: Add end-user feedback on generated answers

Owner: Agent · Depends on: PC-62

- Not doing: Users can rate an answer (Atomic's generated answer shows feedback buttons; not tested yet)
- Not doing: Ratings are captured somewhere we can review them (not verified)

## Parked

- Coveo Knowledge Hub, for reviewing generated answers. Not used in this project.

## Not building

These items are covered in the presentation as our production approach. They are not worthwhile for an application with a few days of use and little traffic:

- Scheduled evals and regression alerts
- Automated configuration drift detection and promotion between environments
- A/B testing of query pipeline changes and of the Query Suggestions model
- Retraining Query Suggestions on logged real queries and clicks, which needs real traffic
- Ongoing review of user feedback and sampled answers
