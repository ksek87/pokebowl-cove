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

**Status:** in development. All 1,028 Pokémon are indexed in Coveo, and the local search page shows results with pictures and filters by Type and Generation. Hosting, generated answers, type-ahead and the detail page are still to come.

## How content is indexed

A Coveo Sitemap source reads the site's sitemap and keeps only individual Pokémon pages. Web scraping removes page navigation and extracts 16 fields, such as Type, Generation and base stats. A Python indexing pipeline extension then rewrites stat tables and type effectiveness grids as readable sentences, so that they work for search and generated answers.

Coveo settings are recorded in [configs/coveo](configs/coveo/), and the reasoning is in the [architecture document](docs/architecture.md).

## Planned features

- Search results with each Pokémon's picture
- Type and Generation filters
- AI-generated answers from the indexed content
- Type-ahead search suggestions
- A detail page for each Pokémon
- Evals and performance benchmarks

## Technology

| Purpose | Tool |
|---|---|
| Application | React, TypeScript and Vite |
| Search interface | Coveo Atomic React |
| Custom interface | Tailwind and shadcn/ui |
| Coveo indexing extension | Python |
| Tests | Vitest, React Testing Library and pytest |
| Continuous integration | GitHub Actions |

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
| `npm run test:e2e` | Run the browser tests against Coveo. Needs the values in `.env` |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `.venv/bin/pytest configs/coveo/extensions` | Run the Coveo extension's tests |

## Documentation

- [Architecture and decisions](docs/architecture.md)
- [Project plan](docs/plan.md)
- [Session handoff](docs/handoff.md)
- [Indexing expected results](docs/indexing-expected-results.md)
- [Coveo configuration](configs/coveo/README.md)
