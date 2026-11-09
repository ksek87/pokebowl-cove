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
| Intermediate | Host the search application | Not started | PC-30 |
| Advanced | Generative answers with Relevance Generative Answering | Built in PR #6; tuning and evals remain | PC-61, PC-62, PC-63, PC-44 |
| Advanced | Preload a Query Suggestions model for type-ahead | Built: model active and default queries live, confirmed in a real browser. The ranked file still needs uploading | PC-50, PC-51 |
| Advanced | Pokémon detail page | Built in PR #6, not yet merged to `main` | PC-70 |
| Advanced | Technical deep dive presentation | Not started | PC-100 |
| Advanced | Enterprise customer value presentation | Not started | PC-102 |
| Bonus | Passage Retrieval: at minimum, understand it and hold a point of view | Point of view written (`docs/passage-retrieval.md`); hands-on setup needs access | PC-02, PC-80 to PC-83 |

Evals, performance baselines and interface polish are additions we chose and are not assessment requirements. They support the presentation.

## How we work

- Work is organized into epics and tickets. Each epic has a separate branch and is tracked through one or more pull requests. Epics 4 to 8 were combined on `integration/overnight`, which is open as PR #6.
- A ticket is done when all of its acceptance criteria are checked.
- Tests or expected results are defined before implementation.
- The user makes all Coveo platform changes, with guidance from the agent.
- Estimates are upper limits for active time and will be revised as we learn the real pace.

**Owners:** *You* is the user, *Agent* is the coding agent and *Both* means the work is done together.

## Sequence

Work with a waiting time, such as Coveo's response or a model build, starts as early as it can.

| Order | Tickets | Notes |
|---|---|---|
| Done | PC-01, PC-03, PC-04, PC-10 to PC-15, PC-20 to PC-23, PC-41, PC-51, PC-60 to PC-62, PC-70, PC-75, PC-76, PC-83 | Index, search application, models, detail page and generated answers. Items after PC-23 are in PR #6 |
| 1. Merge and upload | PR #6, PC-50 | Merge first, so later branches start from it. The ranked suggestions file waits for upload and a build |
| 2. Search quality | PC-52, PC-64 | Partial-name search and links in generated answers |
| 3. Complete the Intermediate tier | PC-30, PC-31 | Hosting also unblocks PC-43 |
| 4. Evals and tuning | PC-40, PC-42, PC-44, PC-63 | PC-42 and PC-44 need the eval API key |
| 5. Bonus | PC-80 to PC-82 | Depends on Coveo enabling access |
| 6. Wrap up | PC-43, PC-78, PC-79, PC-90, PC-91, PC-100 to PC-103 | Business value work comes last |

If Passage Retrieval access has not arrived, write PC-83 and add PC-82 only if access arrives later. If time runs short, drop the stretch goal.

---

## Epic 0: Foundation

**Branch:** `feature/foundation`

### PC-01: Add repository skeleton

Owner: Agent · Estimate: done

- [x] `.gitignore` excludes secrets, dependencies and build output
- [x] `.env.example` lists required variables without values

### PC-02: Request Passage Retrieval access

Owner: You · Estimate: 5 min · Send as soon as possible

Passage Retrieval must be enabled by Coveo before the bonus work can start.

- [ ] Organization ID sent to the Coveo contact
- [ ] Coveo confirms the feature is enabled

### PC-03: Scaffold the application

Owner: Agent · Estimate: 30 min

- [x] React, TypeScript and Vite application runs locally
- [x] Coveo values load from local environment variables

### PC-04: Add test tooling

Owner: Agent · Estimate: 30 min · Depends on: PC-03

- [x] Vitest and React Testing Library run with `npm test`
- [x] One sample test proves the setup works

### PC-05: Add continuous integration

Owner: Agent · Estimate: 30 min · Depends on: PC-04

- [x] GitHub Actions runs tests and the build on every pull request
- [ ] A failing test blocks a passing status

---

## Epic 1: Indexing

**Branch:** `feature/indexing`

### PC-10: Decide the indexing approach

Owner: Both · Estimate: 45 min

- [x] Source type chosen: Web, Sitemap or Push
- [x] Handling of alternate forms, such as Mega Evolutions, chosen
- [x] Method for extracting Generation chosen
- [x] Decisions and rejected alternatives recorded in `docs/architecture.md`

### PC-11: Define expected index results

Owner: Both · Estimate: 30 min · Depends on: PC-10

- [x] Expected title, Type, Generation and image written down for a few Pokémon, including Charizard, whose Mega form has a different Type (see `docs/indexing-expected-results.md`)
- [x] List of URLs that must not be indexed, such as moves and list pages

### PC-12: Create a single-Pokémon test source

Owner: You, guided by Agent · Estimate: 30 min · Depends on: PC-10

This source lets us test configuration without waiting for a full crawl.

- [x] Source indexes exactly one Pokémon page
- [x] The item is visible in the Coveo console

### PC-13: Configure extraction, fields and mappings

Owner: You, guided by Agent · Estimate: 2 h · Depends on: PC-11, PC-12

- [x] Web scraping configuration applied to the test source
- [x] Page clutter is removed from the indexed body
- [x] Type, Generation and image fields are populated
- [x] Detail-page fields are populated
- [x] Results match PC-11, and the final configuration is documented

### PC-15: Reconstruct readable body text

Owner: Both · Estimate: 1.5 h · Depends on: PC-13

Type effectiveness grids and stat tables lose their meaning when flattened into text. A pre-conversion indexing pipeline extension rewrites them as sentences so they are useful to search and generated answers.

- [x] Extension built test-first and verified on saved sample pages
- [x] Extension added in Coveo and applied to the test source
- [x] Charizard's body contains the rewritten sentences and all 16 fields still populate

### PC-14: Run and verify the full crawl

Owner: You, guided by Agent · Estimate: 1 h, plus about 40 min of crawl time · Depends on: PC-13, PC-15

The crawl stays within the site's requested rate of one page every 2 seconds.

- [x] Only individual Pokémon pages are indexed
- [x] Item count is 1,028: 1,025 numbered Pokémon and 3 new Generation 10 Pokémon without numbers
- [x] A sample of items matches the expected field values

---

## Epic 2: Search application

**Branch:** `feature/search-app`

### PC-20: Connect the application to Coveo

Owner: Both · Estimate: 30 min · Depends on: PC-03, PC-12

- [x] Search-only API key created and stored locally
- [x] Atomic search interface returns results from our organization

### PC-21: Display results with pictures

Owner: Agent · Estimate: 1 h · Depends on: PC-13, PC-20

- [x] Each result shows the Pokémon's name and picture
- [x] A missing image does not break the result

### PC-22: Add Type and Generation facets

Owner: Agent · Estimate: 45 min · Depends on: PC-13, PC-20

- [x] Type facet filters results correctly
- [x] Generation facet filters results correctly

### PC-23: Add browser tests for search

Owner: Agent · Estimate: 45 min · Depends on: PC-21, PC-22

- [x] Playwright covers searching, filtering and viewing a result

---

## Epic 3: Hosting and sharing

**Branch:** `feature/hosting`

### PC-30: Host the application

Owner: Both · Estimate: 45 min · Depends on: PC-21

- [x] Hosting provider chosen and recorded in `docs/architecture.md`
- [ ] Application is publicly reachable and returns results
- [ ] Merges deploy automatically

### PC-31: Share the repository with Coveo

Owner: You · Estimate: 15 min · Depends on: PC-30

- [ ] History and files checked for secrets
- [ ] Repository made public or reviewers invited
- [ ] Repository link sent to Coveo

---

## Epic 4: Evals and performance

**Branch:** `feature/evals`, with finished work combined in `integration/overnight` (PR #6)

Evals run on demand with `npm run eval`. The index quality check turns analytics capture off, so its traffic does not affect the analytics used for model training. Relevance and answer evals need a second API key with a separate search hub, because the browser key enforces `pokebowl-search`.

### PC-40: Create eval reference data

Owner: Both · Estimate: 1 h

- [x] Script pulls 30 to 50 sample pages at the site's requested rate
- [x] Expected values are saved as JSON and raw HTML stays out of Git
- [ ] Difficult cases are verified by hand (5 match `docs/indexing-expected-results.md`; 11 remain, such as Farfetch'd, Nidoran♀ and Type: Null)

### PC-41: Add index quality checks

Owner: Agent · Estimate: 30 min · Depends on: PC-14, PC-40

- [x] Indexed Type, Generation and image values are compared with reference data
- [x] The run reports any non-Pokémon pages in the index

### PC-42: Add relevance evals

Owner: Both · Estimate: 1 h · Depends on: PC-14

- [ ] Labelled query set created
- [ ] Recall@K and MRR are reported

### PC-43: Establish the performance baseline

Owner: Agent · Estimate: 45 min · Depends on: PC-30

- [ ] p50 and p95 latency recorded for search, type-ahead, answers and page load
- [ ] Performance targets set from the baseline
- [ ] Reports saved as JSON
- [ ] Bundle size reviewed, including whether a smaller stylesheet for cards is worthwhile (the inline copy is about 2.5% of the gzipped JavaScript)

### PC-44: Add generated answer evals

Owner: Both · Estimate: 1 h · Depends on: PC-62

- [ ] Questions cover expected facts, citations and unanswerable cases
- [ ] Results are saved in a report
- [ ] A real query with results but no answer is checked
- [ ] When a generated answer counts against the allowance is confirmed

---

## Epic 5: Query Suggestions

**Branch:** `feature/query-suggestions`, with finished work combined in `integration/overnight` (PR #6)

### PC-50: Pre-populate suggestions

Owner: Both · Estimate: 1 h · Depends on: PC-20, and the model from PC-51

The application has no real users, so the model has no search history to learn from. Coveo's documented method for a low-traffic environment is a default queries file. See `docs/architecture.md`, section Query Suggestions.

- [x] Preload approach chosen and recorded
- [x] Contents of the default queries file confirmed by the user
- [x] File generated from index values and uploaded to the model
- [ ] Ranked file (2,236 queries with category importance) uploaded, and a model build has picked it up
- [x] Scripted fallback not needed: the model became active

### PC-51: Build the model and enable type-ahead

Owner: Both · Estimate: 45 min, plus model build time · Depends on: PC-20

The model is created first, because the default queries file attaches to an existing model.

- [x] Model is active and associated with the query pipeline
- [x] Search box shows useful suggestions for partial queries, checked in a real browser

### PC-52: Improve results for partial names

Owner: Both · Depends on: PC-14

Searching `char` returns only 5 items, with Charizard last and Charmander missing, because `char` is not a whole word in most names. A ranking expression rule can only reorder what a query already returns, so finding partial names needs a separate method.

- [ ] Coveo's documented options for prefix matching and name boosts read in full and a recommendation agreed
- [ ] Expected results defined for partial-name queries
- [ ] Change applied in `pokebowl-search` and recorded in `configs/coveo/`
- [ ] Expected results verified against live data

---

## Epic 6: Generated answers

**Branch:** `feature/generated-answers`, with finished work combined in `integration/overnight` (PR #6)

### PC-60: Confirm content quality

Owner: Both · Estimate: 30 min · Depends on: PC-14

Generated answers use only an item's body text, so that text must be clean and meaningful.

- [x] Sample item bodies reviewed
- [x] Extraction adjusted if needed (no change was needed)

### PC-61: Create and associate the models

Owner: You, guided by Agent · Estimate: 45 min, plus model build time · Depends on: PC-60

- [x] Semantic Encoder and Relevance Generative Answering (RGA) models use the same content, limited to the full source
- [x] Both models are associated with the `pokebowl-search` query pipeline

### PC-62: Add generated answers to the application

Owner: Agent · Estimate: 45 min · Depends on: PC-61

- [x] Answers and citations display for suitable queries
- [x] Search still works when no answer is generated

### PC-65: Ask about this Pokémon on the detail page

Owner: Agent · Depends on: PC-62, PC-70

An animated Pokéball at the bottom right of the detail page opens a chat panel with suggested questions. Each generates an answer about that Pokémon only when a person picks it, and answers build up as a thread. Coveo documents RGA in a custom interface, and that answers regenerate when results are filtered. Combining these to scope an answer to one item is our inference, checked on seven real questions across six Pokémon.

- [x] Answers cite only the Pokémon shown, checked on a small question set
- [x] No answer is generated on page load
- [x] Citations, disclaimer and feedback match the search page
- [x] Waiting, no-answer and failed states are handled in the thread
- [x] The chat opens from a launcher that does not cover page content, and stays closed on load

### PC-63: Tune answers and add reporting

Owner: Both · Estimate: 45 min · Depends on: PC-62

- [ ] RGA reporting is configured
- [ ] Configuration is tuned using PC-44 results
- [ ] User decides whether an answer disappearing on a non-relevance sort is acceptable (Coveo documents this behavior)

### PC-64: Link Pokémon names in generated answers to detail pages

Owner: Both · Depends on: PC-62

Pokémon mentioned in an answer should link to our detail page, while citations keep linking to pokemondb.net. Atomic has no option to customize how answer text renders. The proposed first approach is a custom prompt instruction that asks for Markdown links. Coveo states such an instruction is not guaranteed to be followed. The alternative is rendering the answer with Headless.

- [ ] Approach agreed by the user
- [ ] Links tested on a small question set, including that relative links render
- [ ] Citations still link to pokemondb.net

---

## Epic 7: Detail page

**Branch:** `feature/detail-page`, with finished work combined in `integration/overnight` (PR #6)

### PC-70: Build the Pokémon detail page

Owner: Agent · Estimate: 2 h · Depends on: PC-21

- [x] Data shown on the page agreed
- [x] Each result links to a page with a shareable URL
- [x] Components are built test-first using shadcn/ui and Tailwind
- [x] Unknown Pokémon show a clear not-found state
- [x] New Pokémon with unknown numbers or empty stats display cleanly
- [x] Pokédex entries from the stored page are shown, with a credit to the source
- [x] Type and Generation link to the filtered search page
- [ ] pokemondb.net terms for quoting the Pokédex text checked

---

## Epic 7a: Interface design and polish

**Branch:** `feature/ui-polish`, with finished work combined in `integration/overnight` (PR #6)

The application is shown live to a panel, so it needs a deliberate, finished design beyond Atomic's default look. Atomic components are styled through theme variables and CSS parts.

### PC-75: Agree the visual direction

Owner: Both· Depends on: PC-22

- [x] Layout, colour, type and tone agreed before styling starts
- [x] Direction recorded in `docs/architecture.md`

### PC-76: Polish the search page

Owner: Agent· Depends on: PC-75

- [x] Header and page layout are designed, with no browser default styling
- [x] Result cards have consistent, correctly sized pictures and show name, number, Type and Generation
- [x] Type is shown with clear visual badges
- [x] Facets, search box, summary and pagination match the design
- [x] Loading, no-results and error states are designed
- [x] Layout works on desktop window widths, with every row of results filled (phone optimization dropped at the user's request)

### PC-79: Move custom interface code to Tailwind and shadcn/ui

Owner: Agent · Depends on: PC-76

Tailwind and shadcn/ui are the approved tools for our interface code. Atomic components stay on Atomic theme variables and CSS parts, because Atomic uses Shadow DOM.

- [x] Header, result cards and Type badges use Tailwind and shadcn/ui; page sizes now use Atomic's control
- [x] Result cards render correctly inside Atomic's Shadow DOM
- [ ] Overrides of Atomic's page layout are reduced to what the documentation supports (loose values are named; the user decides whether to restructure, because it could disturb the page centering)
- [x] Browser tests and a visual check pass at desktop widths

### PC-77: Polish the remaining experiences

Owner: Agent· Depends on: PC-75, PC-62, PC-70

- [x] Generated answers, type-ahead and the detail page match the search page design
- [ ] The bonus feature matches the design, if it is built

### PC-78: Review quality across the application

Owner: Both· Depends on: PC-76, PC-77

- [ ] Reviewed in a real browser by the user, with screenshots at each width
- [ ] Keyboard use, focus states, colour contrast and image alt text checked
- [ ] Page load is measured against PC-43 so polish does not harm performance
- [ ] A card click event is confirmed to reach Coveo in production
- [ ] Real screen reader and a non-Chromium browser checked
- [ ] User decides the open interface questions:
  - Keep the search box centered on the page, or span it across the results column
  - Add a wider layout above 1920 px
  - Suggest close matches on the detail not-found page
  - Add a search box to the detail page
  - Show suggestions on an empty search box
  - Hide sort and page size for very small result sets
  - Shorten the number lookup notice
  - Keep filters or search in view on long pages

---

## Epic 8: Passage Retrieval bonus

**Branch:** `feature/passage-retrieval`

The Passage Retrieval API returns ranked text passages from indexed content, mainly to ground large language model responses.

### PC-80: Set up Passage Retrieval

Owner: You, guided by Agent · Estimate: 45 min · Depends on: PC-02, PC-61

- [ ] Passage Retrieval model created and associated with the query pipeline
- [ ] A test API call returns relevant passages

### PC-81: Choose the feature concept

Owner: Both · Estimate: 30 min · Depends on: PC-80

- [ ] Concept agreed and recorded in `docs/architecture.md`

### PC-82: Build the feature

Owner: Agent · Estimate: 3 h · Depends on: PC-81

- [ ] Feature is built test-first and works in the hosted application
- [ ] Credentials are not exposed beyond what is safe for the browser

### PC-83: Write a point of view on Passage Retrieval

Owner: Both · Estimate: 30 min

This is the minimum outcome for the bonus.

- [x] Documented how the API works and when to use it
- [x] Documented how we would use it in future work

---

## Epic 9: Configuration and documentation

**Branch:** `feature/docs-and-config`

### PC-90: Export the Coveo configuration

Owner: Both · Estimate: 45 min · Depends on: PC-14, PC-61

- [ ] Configuration exported to the repository with the Coveo CLI
- [ ] No secrets appear in the export

### PC-91: Finish the documentation

Owner: Agent · Estimate: 1 h · Depends on: PC-90

- [ ] `docs/architecture.md` reflects the final configuration and decisions
- [ ] README explains how to set up, run, test and evaluate the project

---

## Epic 10: Presentation and business value

**Branch:** `feature/presentation`, if materials are stored in the repository

### PC-100: Prepare the technical deep dive and demo

Owner: Both · Estimate: 2 h · Depends on: PC-44, PC-91

- [ ] Covers what we built, the Coveo configuration, architecture choices and lessons learned
- [ ] Includes eval results
- [ ] Demo has been rehearsed

### PC-101: Prepare the production evaluation approach

Owner: Both · Estimate: 1 h

- [ ] Explains evals over time, end-user feedback, sampling and A/B testing, using Coveo's tools where possible

### PC-102: Develop the customer business case

Owner: You, supported by Agent · Estimate: 2 h

- [ ] Enterprise customer chosen from past or present experience
- [ ] Solution and value proposition prepared for that customer

### PC-103: Submit the presentation materials

Owner: You · Estimate: 15 min · Depends on: PC-100, PC-101, PC-102

- [ ] Materials submitted before the session

---

## Stretch goals

### PC-S1: Add end-user feedback on generated answers

Owner: Agent · Estimate: 1 h · Depends on: PC-62

- [ ] Users can rate an answer (Atomic's generated answer shows feedback buttons; not tested yet)
- [ ] Ratings are captured somewhere we can review them (not verified)

## Parked

- Access to Coveo Knowledge Hub, a limited early-access tool for reviewing generated answers. It may require a request to Coveo.

## Not building

These items are covered in the presentation as our production approach. They are not worthwhile for an application with a few days of use and little traffic:

- Scheduled evals and regression alerts
- Automated configuration drift detection and promotion between environments
- A/B testing of query pipeline changes and of the Query Suggestions model
- Retraining Query Suggestions on logged real queries and clicks, which needs real traffic
- Ongoing review of user feedback and sampled answers
