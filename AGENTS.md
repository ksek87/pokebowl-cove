# Agent Rules

## Project

We are building a Pokémon search application on the Coveo platform, using content indexed from pokemondb.net. The work is a technical assessment and will be presented to Coveo experts, so every important choice must be explainable and defensible.

## Starting a session

- Read `docs/handoff.md` before starting work, and update it before ending a session.

## Working together

- Do not write code or create files until the user asks for it.
- Discuss architectural decisions and tradeoffs with the user before acting on them. The user makes the final decision.
- Build understanding before making decisions. Keep discussion at the level the user is working at, and do not jump ahead into details or planning.
- Base Coveo guidance on the current Coveo documentation, not on memory. Say so when something could not be confirmed.
- Read the relevant Coveo documentation in full before giving any platform instruction or diagnosing any failure. When a step does not work, find the cause in the documentation before asking the user to retry anything. Never have the user repeat steps to test a guess.
- Cite the relevant Coveo documentation whenever discussing or recording the reasoning and tradeoffs behind a Coveo decision, and separate what the documentation states from our own inference.
- The user makes all changes in the Coveo platform, with the agent's guidance, unless the user instructs otherwise.
- Clearly flag every action the user must take personally, such as work in the Coveo console, and guide them through it step by step.
- Prefer a Coveo API over the console when a task would otherwise repeat a manual step. Record which API was used and why in `docs/architecture.md`, and keep the request body in `configs/`.

## Scope

- Complete every item in the challenge, including the bonus. Drop an item only if we identify a real problem and can defend the decision.
- Handle business value and customer use case work last.

## Engineering

- Do not over-engineer. Build what the current task needs, and add abstractions only when they provide real, present reuse.
- Follow Test Driven Development. Write a failing test first, then implement the code that makes it pass.
- Apply the same approach to Coveo configuration. Define the expected results first, then verify them against real data.
- Use a dedicated Coveo source containing a single Pokémon to test configuration before running a full crawl.
- Stay within the crawl rate that pokemondb.net requests.
- Consider latency and performance in every design and implementation decision. Measure a baseline first, then set targets from it.

## Architecture

- Use Node 24, as set in `.nvmrc`. Newer versions make npm install an old Atomic release.
- Keep Coveo SDK code in `src/App.tsx` and `src/search/`.
- Read environment values only in `src/main.tsx`, through `src/config.ts`.
- Keep shared settings in `src/search/settings.ts`. It imports nothing, because browser tests import it.
- Use Tailwind and shadcn/ui for our own interface code, and Atomic theme variables and CSS parts for Atomic components. Do not edit generated files in `src/components/ui` for style findings.
- Route queries by search hub. Do not name a query pipeline in the application.
- Associate models and Query Suggestions with the `pokebowl-search` pipeline.

## Web development standards

- Do not hardcode values that come from data or configuration. Never assume how many Types, Generations, results or other items exist. Derive them from the data.
- Define each design and configuration value once, with a name, and reuse it. This covers colors, spacing, widths, breakpoints, page sizes and asset paths. Do not repeat literal values across files.
- Do not make one value silently depend on another, such as a grid that only works with certain page sizes. Derive them from one shared setting.
- Tests read shared settings or check behavior. They do not repeat configured values.
- Ask the user before choosing product behavior, such as option lists, defaults and result order.
- Check every interface change in a real browser, at the window widths the user cares about, before reporting it as done. Tests that mock components do not prove a page looks or works right.
- Fix the cause of a layout problem. Do not stack overrides until one measurement passes.

## Tooling

- Hand fixes from Rerail scans to subagents, so the user can keep working and review the results afterwards.

## Evaluation

- Create evals and benchmarks that measure how well the application works and prove that it works properly.
- Document how we would test and evaluate the application in production if it were a final client product, such as evals over time, end-user feedback and sampling.
- Use GitHub CI/CD to run tests and evals where practical. Prefer Coveo's built-in evaluation and deployment tools when they meet the need.

## Security

- Never commit secrets. Keep them in local environment files that are excluded by `.gitignore`.
- Keep a `.gitignore` in the repository and a template listing required environment variables without their values.
- Only a search-only key may reach the browser.

## Git and project tracking

- Manage the work like a product: plan it in `docs/plan.md` and track progress through branches and pull requests.
- Use a separate branch for each feature.
- Commit and push only when the user asks.
- Never add Claude as a co-author or include any Claude attribution in commits or pull requests.

## Documentation

- Document everything we do, including the final Coveo configuration.
- Keep a copy of every configuration we write or apply in `configs/`, updated whenever a setting changes, and never include secrets.
- Record architecture and decisions in `docs/architecture.md` as soon as they are approved, including the alternatives we rejected and why.
- Keep the plan and all tasks in `docs/plan.md`.
- Write in coherent, simple technical English.
- Make every document self-contained. A reader who has never seen the challenge documents must be able to understand it, so explain the requirement or context in our own words instead of quoting or abruptly referencing those documents.
