# Agent Rules

## Project

We are building a Pokémon search application on the Coveo platform, using content indexed from pokemondb.net. The work is a technical assessment and will be presented to Coveo experts, so every important choice must be explainable and defensible.

## Working together

- Do not write code or create files until the user asks for it.
- Discuss architectural decisions and tradeoffs with the user before acting on them. The user makes the final decision.
- Build understanding before making decisions. Keep discussion at the level the user is working at, and do not jump ahead into details or planning.
- Base Coveo guidance on the current Coveo documentation, not on memory. Say so when something could not be confirmed.
- Cite the relevant Coveo documentation whenever discussing or recording the reasoning and tradeoffs behind a Coveo decision, and separate what the documentation states from our own inference.
- The user makes all changes in the Coveo platform, with the agent's guidance, unless the user instructs otherwise.
- Clearly flag every action the user must take personally, such as work in the Coveo console, and guide them through it step by step.

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
