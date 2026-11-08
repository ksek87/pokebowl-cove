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

**Status:** early development. The application scaffold, tests and continuous integration are in place, and Coveo extraction has been validated on a single test page. The full crawl, Coveo connection and search interface are not finished yet.

Coveo settings are recorded in [configs/coveo](configs/coveo/).

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
| Tests | Vitest and React Testing Library |
| Continuous integration | GitHub Actions |

## Getting started

You need Node.js 24 or later.

```sh
npm install
cp .env.example .env
```

Add your Coveo organization ID and search-only API key to `.env`. Never commit this file, and never use an API key with broader permissions in a `VITE_` variable, because those values are included in the browser bundle.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm test` | Run the tests |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |

## Documentation

- [Architecture and decisions](docs/architecture.md)
- [Project plan](docs/plan.md)
