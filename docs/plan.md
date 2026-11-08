# Project Plan

## Goal

Build a Pokémon search application on the Coveo platform. The content comes from the individual Pokémon pages on pokemondb.net. Users can search, filter by Type and Generation, see each Pokémon's picture, read AI-generated answers, get type-ahead suggestions and open a detail page for a single Pokémon.

The finished work is presented to a panel of Coveo experts in a 45-minute session that covers what we built, how Coveo is configured, why we made our choices and what the solution is worth to a real enterprise customer.

**Target completion:** Friday, November 13, 2026.

## How we work

- Work is organized into epics and tickets. Each epic has its own branch and is tracked through one or more pull requests.
- A ticket is done when all of its acceptance criteria are checked.
- Tests or expected results are defined before implementation.
- The user makes all Coveo platform changes, with guidance from the agent.
- Estimates are upper limits for active time and will be revised as we learn the real pace.

**Owners:** *You* is the user, *Agent* is the coding agent and *Both* means the work is done together.

## Sequence

| Stage | Tickets | Notes |
|---|---|---|
| 1. Foundation | PC-03 to PC-05 | Can run alongside stage 2 |
| 2. Index | PC-10 to PC-14 | Every later stage depends on correct data |
| 3. Search | PC-20 to PC-23, PC-30, PC-31 | Can start against the single-Pokémon source |
| 4. Models and evals | PC-40 to PC-43, PC-50, PC-51, PC-60 to PC-64 | Start PC-50 as soon as search works, because its data must exist before the model can build |
| 5. Detail page and bonus | PC-70, PC-80 to PC-83 | PC-70 can run in parallel with stage 4 |
| 6. Wrap-up | PC-44, PC-90, PC-91, PC-100 to PC-103 | Business value work comes last |

If time runs short, reduce the bonus to PC-83 and drop the stretch goal.

---

## Epic 0: Foundation

**Branch:** `feature/foundation`

### PC-01: Add repository skeleton

Owner: Agent · Estimate: done

- [x] `.gitignore` excludes secrets, dependencies and build output
- [x] `.env.example` lists required variables without values

### PC-02: Request Passage Retrieval access

Owner: You · Estimate: 5 min · Send on Monday, November 9

Passage Retrieval must be enabled by Coveo before the bonus work can start.

- [ ] Organization ID sent to the Coveo contact
- [ ] Coveo confirms the feature is enabled

### PC-03: Scaffold the application

Owner: Agent · Estimate: 30 min

- [x] React, TypeScript and Vite application runs locally
- [ ] Coveo values load from local environment variables

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

### PC-14: Run and verify the full crawl

Owner: You, guided by Agent · Estimate: 1 h, plus about 40 min of crawl time · Depends on: PC-13

The crawl stays within the site's requested rate of one page every 2 seconds.

- [ ] Only individual Pokémon pages are indexed
- [ ] Item count is 1,028: 1,025 numbered Pokémon and 3 new Generation 10 Pokémon without numbers
- [ ] A sample of items matches the expected field values

---

## Epic 2: Search application

**Branch:** `feature/search-app`

### PC-20: Connect the application to Coveo

Owner: Both · Estimate: 30 min · Depends on: PC-03, PC-12

- [ ] Search-only API key created and stored locally
- [ ] Atomic search interface returns results from our organization

### PC-21: Display results with pictures

Owner: Agent · Estimate: 1 h · Depends on: PC-13, PC-20

- [ ] Each result shows the Pokémon's name and picture
- [ ] A missing image does not break the result

### PC-22: Add Type and Generation facets

Owner: Agent · Estimate: 45 min · Depends on: PC-13, PC-20

- [ ] Type facet filters results correctly
- [ ] Generation facet filters results correctly

### PC-23: Add browser tests for search

Owner: Agent · Estimate: 45 min · Depends on: PC-21, PC-22

- [ ] Playwright covers searching, filtering and viewing a result

---

## Epic 3: Hosting and sharing

**Branch:** `feature/hosting`

### PC-30: Host the application

Owner: Both · Estimate: 45 min · Depends on: PC-21

- [ ] Hosting provider chosen and recorded in `docs/architecture.md`
- [ ] Application is publicly reachable and returns results
- [ ] Merges deploy automatically

### PC-31: Share the repository with Coveo

Owner: You · Estimate: 15 min · Depends on: PC-30

- [ ] History and files checked for secrets
- [ ] Repository made public or reviewers invited
- [ ] Repository link sent to Coveo

---

## Epic 4: Evals and performance

**Branch:** `feature/evals`

Evals run on demand with `npm run eval` and use a dedicated search hub so that their traffic does not affect the analytics used for model training.

### PC-40: Create eval reference data

Owner: Both · Estimate: 1 h

- [ ] Script pulls 30 to 50 sample pages at the site's requested rate
- [ ] Expected values are saved as JSON and raw HTML stays out of Git
- [ ] Difficult cases are verified by hand

### PC-41: Add index quality checks

Owner: Agent · Estimate: 30 min · Depends on: PC-14, PC-40

- [ ] Indexed Type, Generation and image values are compared with reference data
- [ ] The run reports any non-Pokémon pages in the index

### PC-42: Add relevance evals

Owner: Both · Estimate: 1 h · Depends on: PC-14

- [ ] Labelled query set created
- [ ] Recall@K and MRR are reported

### PC-43: Establish the performance baseline

Owner: Agent · Estimate: 45 min · Depends on: PC-30

- [ ] p50 and p95 latency recorded for search, type-ahead, answers and page load
- [ ] Performance targets set from the baseline
- [ ] Reports saved as JSON

### PC-44: Add generated answer evals

Owner: Both · Estimate: 1 h · Depends on: PC-62

- [ ] Questions cover expected facts, citations and unanswerable cases
- [ ] Results are saved in a report

---

## Epic 5: Query Suggestions

**Branch:** `feature/query-suggestions`

### PC-50: Preload analytics data

Owner: Both · Estimate: 1 h · Depends on: PC-20

The model learns from search and click analytics and needs at least 100 events.

- [ ] Preload approach chosen and recorded
- [ ] Realistic searches and clicks recorded in Coveo Analytics

### PC-51: Build the model and enable type-ahead

Owner: Both · Estimate: 45 min, plus model build time · Depends on: PC-50

- [ ] Model is active and associated with the query pipeline
- [ ] Search box shows useful suggestions for partial queries

---

## Epic 6: Generated answers

**Branch:** `feature/generated-answers`

### PC-60: Confirm content quality

Owner: Both · Estimate: 30 min · Depends on: PC-14

Generated answers use only an item's body text, so that text must be clean and meaningful.

- [ ] Sample item bodies reviewed
- [ ] Extraction adjusted if needed

### PC-61: Create and associate the models

Owner: You, guided by Agent · Estimate: 45 min, plus model build time · Depends on: PC-60

- [ ] Semantic Encoder and Relevance Generative Answering (RGA) models use the same content
- [ ] Both models are associated with the same query pipeline

### PC-62: Add generated answers to the application

Owner: Agent · Estimate: 45 min · Depends on: PC-61

- [ ] Answers and citations display for suitable queries
- [ ] Search still works when no answer is generated

### PC-63: Tune answers and add reporting

Owner: Both · Estimate: 45 min · Depends on: PC-62

- [ ] RGA reporting is configured
- [ ] Configuration is tuned using PC-44 results

### PC-64: Spike on body text parsing

Owner: Both · Estimate: 1 h, plus a full rebuild if the extraction changes · Depends on: PC-44

Some page content loses its meaning when flattened into body text, and some adds noise. We will use eval results to decide how to handle it so that the information remains complete and usable, rather than simply removing it.

- [ ] Evaluate the Type defenses grid, which loses the link between each value and its attacking type
- [ ] Evaluate the unlabelled stat minimum and maximum columns
- [ ] Evaluate the stat range explanation, "Additional artwork" labels and Local № lists
- [ ] Decide what to parse properly, keep or remove, and record the decision in `docs/architecture.md`
- [ ] Apply any change and compare eval results before and after

---

## Epic 7: Detail page

**Branch:** `feature/detail-page`

### PC-70: Build the Pokémon detail page

Owner: Agent · Estimate: 2 h · Depends on: PC-21

- [ ] Data shown on the page agreed
- [ ] Each result links to a page with a shareable URL
- [ ] Components are built test-first using shadcn/ui and Tailwind
- [ ] Unknown Pokémon show a clear not-found state
- [ ] New Pokémon with unknown numbers or empty stats display cleanly

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

- [ ] Documented how the API works and when to use it
- [ ] Documented how we would use it in future work

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

- [ ] Users can rate an answer
- [ ] Ratings are captured somewhere we can review them

## Parked

- Access to Coveo Knowledge Hub, a limited early-access tool for reviewing generated answers. It may require a request to Coveo.

## Not building

These items are covered in the presentation as our production approach. They are not worthwhile for an application with a few days of use and little traffic:

- Scheduled evals and regression alerts
- Automated configuration drift detection and promotion between environments
- A/B testing of query pipeline changes
- Ongoing review of user feedback and sampled answers
