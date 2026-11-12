<p align="center">
  <img src="docs/assets/pokeball.svg" alt="" width="120" />
</p>

<h1 align="center">pokebowl-cove</h1>

<p align="center">
  <strong>Search every Pokémon, powered by Coveo.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Coveo-Atomic-f05245" alt="Coveo Atomic" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white" alt="TypeScript 7" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8" />
</p>

A Pokémon search application built on the [Coveo](https://www.coveo.com/) platform. It indexes the individual Pokémon pages on [pokemondb.net](https://pokemondb.net/) so that users can find Pokémon by searching and by filtering on Type and Generation.

**Live site:** [pokebowl-cove.vercel.app](https://pokebowl-cove.vercel.app/). All 1,028 Pokémon are indexed in Coveo.

## Assessment requirements

The assessment set four tiers of work: essential, intermediate, advanced and a bonus. Each requirement and where it is built:

| Tier | Requirement | Where |
|---|---|---|
| Essential | Atomic or Headless installed locally | Atomic React and Headless in `package.json`; the search page in [`src/App.tsx`](src/App.tsx) |
| Essential | Index only the individual Pokémon pages | Sitemap source with one URL rule: [`configs/coveo/full-source.json`](configs/coveo/full-source.json), reasoning in [Coveo source: Sitemap](docs/architecture.md#coveo-source-sitemap) |
| Essential | Connect the search page to Coveo | [`src/main.tsx`](src/main.tsx), [`src/config.ts`](src/config.ts) and [`src/search/engine.ts`](src/search/engine.ts), with a search-only key ([Search application connection](docs/architecture.md#search-application-connection)) |
| Essential | Filter by Type and by Generation | Facets in [`src/App.tsx`](src/App.tsx), fields from web scraping in [`configs/coveo/fields.json`](configs/coveo/fields.json) and [`configs/coveo/web-scraping.json`](configs/coveo/web-scraping.json) |
| Essential | Show each Pokémon's picture in its result | [`src/search/PokemonResult.tsx`](src/search/PokemonResult.tsx) |
| Intermediate | Host the code on GitHub | This repository |
| Intermediate | Host the search application | [pokebowl-cove.vercel.app](https://pokebowl-cove.vercel.app/) ([Hosting](docs/architecture.md#hosting)) |
| Advanced | Generated answers with RGA | `atomic-generated-answer` in [`src/App.tsx`](src/App.tsx), the model in [`configs/coveo/ml-models.json`](configs/coveo/ml-models.json), the prompt instruction in [`configs/coveo/rga-prompt-instruction.txt`](configs/coveo/rga-prompt-instruction.txt) ([Generated answers](docs/architecture.md#generated-answers)) |
| Advanced | Preload a Query Suggestions model for type-ahead | Default queries file [`configs/coveo/query-suggestions-default-queries.csv`](configs/coveo/query-suggestions-default-queries.csv) ([Query Suggestions](docs/architecture.md#query-suggestions)) |
| Advanced | Pokémon detail page | [`src/search/PokemonDetailPage.tsx`](src/search/PokemonDetailPage.tsx) ([Pokémon detail page](docs/architecture.md#pokémon-detail-page)) |
| Advanced | Technical deep dive and enterprise customer presentations | Presented to the panel. The production evaluation approach is in [docs/evaluation.md](docs/evaluation.md) |
| Bonus | Understand Passage Retrieval and hold a point of view on it | Presented to the panel as part of the case studies |

The final Coveo configuration, exported with the Coveo CLI, is in [`configs/coveo/export/`](configs/coveo/export/).

## How it works

| Layer | What we use |
|---|---|
| Content | A Coveo Sitemap source that keeps only the individual Pokémon pages, at the 2-second crawl delay pokemondb.net asks for. A separate single-Pokémon source tests configuration changes before a full crawl |
| Fields | Web scraping removes page navigation and extracts 16 fields, such as Type, Generation, picture and base stats |
| Body text | A Python pre-conversion extension rewrites data tables, stat tables, type grids and the evolution chart as sentences that name each Pokémon form, so search and generated answers can use them |
| Query | A dedicated `pokebowl-search` query pipeline, reached through the search hub, limits the application to the Pokémon source. The browser holds only a search-only API key that enforces this search hub |
| Machine learning | A Semantic Encoder for retrieval by meaning, Relevance Generative Answering (RGA) for cited answers with a custom prompt instruction, and Query Suggestions started from a default queries file built from index values |
| Interface | Coveo Atomic React, with Tailwind and shadcn/ui for our components, hosted on Vercel |

The [architecture document](docs/architecture.md) has the diagram, each decision with the Coveo documentation behind it, and the alternatives we rejected. Every Coveo setting we applied is recorded in [configs/coveo](configs/coveo/), along with an export of the live organization made with the Coveo CLI ([configs/coveo/export](configs/coveo/export/)).

## Features

- Search results with each Pokémon's picture
- Type and Generation filters
- Pokédex order on the home page and a sort control
- Exact Pokédex lookup for number-only searches, and partial-name search such as `char`
- Query correction
- Type-ahead search suggestions
- AI-generated answers from the indexed content, with citations and feedback buttons
- A shareable detail page for each Pokémon, with its Pokédex entries and an "Ask about this Pokémon" bubble for generated answers about that Pokémon only

## How well it works

Every eval runs against the live Coveo organization with analytics capture off. The method, sources and full results are in the [evaluation document](docs/evaluation.md).

| Eval | Result (November 2026) |
|---|---|
| Index quality | 1,028 of 1,028 Pokémon indexed, 0 field mismatches on 40 sampled pages, no stray pages |
| Relevance, 123 labelled queries | MRR 0.947 against a 0.95 target, Recall@3 0.957. The gap is descriptive queries such as `water turtle` |
| Generated answers, 45 cases | 38 passed. Graded by code for expected facts in the opening, citations, wrong weaknesses and declining unrelated questions |
| Performance, from one developer machine | Search p50 188 ms and p95 225 ms, type-ahead p95 68 ms, first answer text p50 2.1 s and p95 4.9 s |
| Tests | 374 unit tests, 189 browser tests and 66 extension tests, all passing |

**Known limits and future work.** Species questions give the species after the opening sentence, "Which Pokémon evolves into Charizard?" opens imprecisely with Charmander, and two questions get no answer. These are documented with candidate changes rather than fixed, because each prompt change costs a model rebuild and is not guaranteed to hold. Results are a snapshot: Coveo models rebuild weekly, so in production the evals would run after every rebuild to detect drift. Passage Retrieval, an optional bonus, is covered by a written [point of view](docs/passage-retrieval.md).

## Technology

| Purpose | Tool |
|---|---|
| Application | React, TypeScript and Vite |
| Search interface | Coveo Atomic React and Headless |
| Custom interface | Tailwind and shadcn/ui |
| Coveo indexing extension | Python |
| Tests | Vitest, React Testing Library, Playwright and pytest |
| Hosting | Vercel, deployed from `main` |
| Continuous integration | GitHub Actions: unit tests, build and extension tests on every push |

## Getting started

You need Node.js 24, as set in `.nvmrc`. Newer versions make npm install an old Atomic release. Python 3 is needed only to run the extension's tests.

```sh
npm install
cp .env.example .env

# Optional, for the Coveo extension's tests
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

Add your Coveo organization ID and search-only API key to `.env`. Never commit this file, and never use an API key with broader permissions in a `VITE_` variable, because those values are included in the browser bundle.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm test` | Run the unit tests |
| `npm run test:e2e` | Run the browser tests. Needs the values in `.env` |
| `npm run build` | Type-check and build for production. Fails if the Coveo values are missing |
| `npm run preview` | Serve the production build locally |
| `.venv/bin/pytest configs/coveo/extensions` | Run the Coveo extension's tests |
| `npm run eval` | Compare the index with the reference data |
| `npm run eval:relevance` | Run the labelled relevance queries |
| `npm run eval:answers` | Run and grade the generated answer cases |
| `npm run eval:answers:regrade` | Grade a saved answer report again with the current grader, without calling Coveo |
| `npm run eval:prefix-benchmark` | Compare partial-name boost settings |
| `npm run eval:performance` | Measure Coveo API and hosted page timings |
| `npm run eval:bundle` | Measure the JavaScript a visitor downloads |
| `npm run eval:reference`, `npm run eval:sets` | Rebuild the reference data and the eval question sets |

The live evals need the values in `.env`. They query the application's search hub with analytics capture off, so their traffic does not train the models. Reports are saved in `evals/reports/`.

## Documentation

- [Architecture and decisions](docs/architecture.md)
- [Evaluation: what we measure and how we would evaluate in production](docs/evaluation.md)
- [Project plan](docs/plan.md)
- [Indexing expected results](docs/indexing-expected-results.md)
- [Passage Retrieval point of view](docs/passage-retrieval.md)
- [Coveo configuration](configs/coveo/README.md)
