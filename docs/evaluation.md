# Evaluation and Benchmarking

This document explains how we test whether the Pokémon search application works, how we would evaluate it in production, and which sources support each choice. It covers the index, search relevance, partial-name search, generated answers, and performance. The detailed results and decisions behind each number are in `docs/architecture.md`.

The application is a take-home technical assessment with no real users. Everything we measure today is therefore **offline**: fixed test sets run against live Coveo. Production evaluation adds **online** signals from real users. Both are described here.

## Principles

1. **Define expected results first, then measure.** Each eval has reference data written before tuning. The same applies to Coveo configuration (see `docs/indexing-expected-results.md`).
2. **Measure the shipped behaviour.** Evals send the same request body as the application, through `rewriteSearchBody` in `src/search/queryRewrite.ts`, in the `pokebowl-search` pipeline.
3. **Do not pollute analytics.** Every eval request sends `analytics.capture: false`, so test traffic cannot train Coveo ML models or skew reports. Searches also send `maximumAge: 0`, so Coveo's cache does not hide index time.
4. **Stay polite.** Requests run one at a time and paced. Coveo requires load tests to be [planned with and authorized by Coveo](https://docs.coveo.com/en/1948/), and pokemondb.net asks for 2 seconds between requests.
5. **Report uncertainty.** The test sets are small, so a score is an estimate. We report the standard error where it changes a conclusion (see [Uncertainty](#uncertainty)).
6. **Do not tune the test to pass.** A missed target is recorded as missed.

## What we measure today

| Eval | Question it answers | Method | Latest result | Command |
|---|---|---|---|---|
| Index quality | Did the crawl index the right pages with the right values? | 40 sampled pages compared field by field with reference data read from pokemondb.net. 16 difficult pages verified by hand. Also checks item count, duplicates and non-Pokémon pages | 1,028 of 1,028 items, 0 mismatches, 0 stray pages | `npm run eval` |
| Relevance | Do the right Pokémon rank first? | 123 labelled queries in 8 categories (name, Type, Generation, ability, species, partial name, descriptive, natural language). Mean reciprocal rank (MRR) and Recall@3 and @12 | MRR 0.947, Recall@3 0.957, Recall@12 0.968 (after the November 9 rebuild) | `npm run eval:relevance` |
| Partial-name benchmark | Which boost makes `char` return the Char- names first? | 171 queries run once for each boost setting, with a name-first measure that MRR cannot see | Boost 300 chosen: lowest setting that reaches the best score on every measure. Still true after the rebuild | `npm run eval:prefix-benchmark` |
| Generated answers | Are answers correct, cited, absent when they should be, and written as direct answers? | Question set with expected facts, an accepted citation, unanswerable questions, answers scoped to one Pokémon, and judgment questions. Automatic grading by string match, a check that the opening answers a direct question, a check for weaknesses that must not appear, and style counts. Cases a person must review are flagged | **38 of 45** passed with prompt version 3 and the evolution sentences (November 10). With the same grader, prompt version 2 scores 33 of 40 and the November 9 baseline 31 of 40. All 7 base-form cases pass. 1 of 37 answers refers to the documentation (was 15 of 32), median 46 words. Open failures: species questions answered after the opening, a reverse evolution question, Mewtwo's evolution and Charizard's water weakness. 16 flagged for human review | `npm run eval:answers`; `npm run eval:answers:regrade` regrades a saved report |
| Performance | Is it fast enough, and did a change make it slower? | p50 and p95 for Coveo API calls, plus hosted page timings in headless Chromium | Search p95 225 ms, type-ahead p95 68 ms, answer first text p95 4.9 s, first result visible p95 1.9 s. p50 values unchanged; several p95 values over target (see `docs/architecture.md`) | `npm run eval:performance` |
| Bundle size | How much JavaScript does a visitor download? | Production build, gzip per file, share by package | 448 kB gzipped entry JavaScript, mostly Coveo Atomic and its dependencies | `npm run eval:bundle` |
| Unit, browser and extension tests | Does each behaviour still work? | 348 unit tests, 182 browser tests with a stubbed answer stream, 66 Python tests for the indexing extension | All pass; unit and Python tests run in GitHub CI | `npm test`, `npm run test:e2e`, `pytest` |

Reports are saved as JSON in `evals/reports/`, and reference data is in `evals/reference/`.

The answer set has 40 cases, including 7 base-form height and weight cases and a Charizard weakness case. They were run after the full source rebuild on November 9. Only 3 of the 7 base-form cases passed: Charizard's weight came back as 110.5 kg (Mega Charizard X), Venusaur's weight and height as Mega Venusaur's, and Lucario's height as Mega Lucario's. The three that passed (Lucario's, Meowth's and Tauros's weight) list the base value together with other forms' values, and are flagged for a person to check. Lucario's height also fails as a plain fact case, and "What does Pikachu evolve into?" and "Is Charizard weak to water?" get no answer.

The indexed body is correct: it states "Charizard weighs 90.5 kg" and names each Mega form in its own sentence. The answers do not reflect it, and the Lucario answer labels its three weights "First Documentation", "Second Documentation" and "Third Documentation" with no form names. Our inference is that the RGA model still held the old body text, whose form tables had no form names. The Search API key cannot show a model's build state, so this could not be confirmed from here. The RGA model rebuilds when its configuration is saved, and the custom prompt instruction for answer style is now at version 2 (see `docs/architecture.md`, Answer style). Version 1 was replaced before the answer evals could measure it. The live answer evals run again once the RGA model is active with version 2. Because the new body text and the prompt go live in the same rebuild, the evals cannot say which of the two fixed a given answer. The Semantic Encoder rebuilds weekly, next about November 15, so results may change again after it.

**Result with prompt version 2, November 10.** Run after the RGA model rebuilt with the new body text and prompt version 2, and compared case by case with the regraded baseline (same grader):

| | Baseline, November 9 | Version 2, November 10 |
|---|---|---|
| Passed | 32 of 40 | 37 of 40 |
| Base-form height and weight | 3 of 7 | 7 of 7 |
| Starts with a direct answer | 0 of 32 | 32 of 32 |
| Refers to the documentation | 15 of 32 | 0 of 32 |
| Median words | 26 | 41 |
| Longest answer | 732 words | 246 words |
| First text, p50 and p95 | 2.1 s, 5.5 s | 2.0 s, 2.8 s |

Six cases flipped to pass: the four base-form failures, Lucario's height and the Charizard weakness case, which now lists only Rock, Water and Electric as weaknesses and gives Grass and Bug as 0.25x. One flipped to fail: "What species is Eevee?" opens with Eevee's Type and Generation and never gives its species, the Evolution Pokémon. "What does Pikachu evolve into?" and "Is Charizard weak to water?" still get no answer. Because the body text and the prompt went live in the same rebuild, the run cannot say which change fixed the form values; the style changes come from the prompt. The Semantic Encoder still holds the old body text until its weekly rebuild, about November 15.

**Result with prompt version 3 and the evolution sentences, November 10.** Run after the full source rebuild with the evolution sentences and the RGA rebuild with prompt version 3. Before the run, the Search API confirmed that the new sentences, such as "Pikachu evolves into Alolan Raichu (use Thunder Stone, in Alola).", are on exactly the pages of each family, and that the old flattened chart is gone. The Semantic Encoder had not rebuilt; it cannot be rebuilt by hand, and its schedule is read-only in the console. The grader was made stricter first (see Checks added below), and the three saved reports were regraded with it, so the columns compare like with like:

| Same grader | Baseline, November 9 | Version 2, November 10 | Version 3 and evolution sentences, November 10 |
|---|---|---|---|
| Passed | 31 of 40 | 33 of 40 | 38 of 45 |
| Base-form height and weight | 2 of 7 | 7 of 7 | 7 of 7 |
| Species questions, answered in the opening | 4 of 4 | 0 of 4 | 0 of 4 |
| Evolution questions (judgment and scoped) | 1 of 2 | 0 of 2 | 5 of 7 |
| Refers to the documentation | 15 of 32 | 0 of 32 | 1 of 37 |
| Median words | 26 | 41 | 46 |
| First text, p50 and p95 | 2.1 s, 5.5 s | 2.0 s, 2.8 s | 2.0 s, 3.1 s |

What the evolution sentences fixed: "What does Pikachu evolve into?" now lists Raichu and Alolan Raichu with their conditions, "How does Pikachu evolve into Alolan Raichu?" and "Which Eevee evolution uses a Water Stone?" pass, and the detail page question "Describe how Pikachu evolves" and "Describe how Charizard evolves" name the whole chain.

What still fails, stated plainly:

- **Species questions answer after the opening.** "What species is Pikachu?" opens with "Pikachu is an Electric type Pokémon introduced in Generation 1." and gives "Mouse Pokémon" only in the details. The same happens for Charizard, Eevee and Gengar. The baseline, with Coveo's default prompt, opened with the species in all four. Prompt version 3 asked for exactly this and did not change it. Our inference is that the answer pattern in our instruction, which leads with Type and Generation, outweighs the rule. Coveo states that a custom instruction "isn't guaranteed to be followed fully or consistently" ([Create and manage RGA models](https://docs.coveo.com/en/nb6a0085/)).
- **"Which Pokémon evolves into Charizard?"** opens with "Charmander evolves into Charizard." The details below are right (Charmander to Charmeleon at Level 16, Charmeleon to Charizard at Level 36), but the opening skips a step. The body text is correct, so the model collapsed the chain.
- **"Describe how Mewtwo evolves"** gets no answer. The detail page suggests this question for every Pokémon, and Mewtwo's page states "Mewtwo does not evolve."
- **"Is Charizard weak to water?"** gets no answer, as in every earlier run.

These are documented, not fixed. Each further prompt change costs an RGA rebuild and is not guaranteed to hold, and with no real users there is no traffic to show which errors matter most. In production, the next iterations would be driven by evidence: answer feedback and sampled reviews would show which question types fail most, the Chunk Inspector would show whether the right passage reached the model, and each prompt change would be measured against this eval set before rollout (see How we would evaluate in production). Candidate changes to test, by our inference: an instruction example that leads with the asked attribute instead of Type, reverse evolution sentences in the body ("Charizard evolves from Charmeleon"), and checking why a page that does not evolve yields no answer. The Semantic Encoder rebuild, about November 15, may also change results, so the evals run again after it.

**Checks added on November 10.** The November 9 report was regraded offline with the new checks and saved as `evals/reports/answers-baseline-2026-11-09.json`, so the next run is compared with the same grader. Its result is 32 of 40, one fewer than the 33 first reported.

- **Weaknesses that must not appear.** String matching only checks that expected facts are present. The Charizard weakness answer named Rock, Water and Electric, so it passed, but it also listed Grass and Bug as 4x weaknesses. The case now carries the types Charizard resists or is immune to, read from the base form's type defense grid on pokemondb.net (`evals/reference/form-facts.json`). The case fails when one of them appears in a sentence or list line that claims a weakness (such as "weak", "super-effective", "2x" or "4x") and does not mention a resistance. The Pokémon's own Type, written as "Fire/Flying" or "Fire type", does not count. With this check the November 9 Charizard answer fails, naming Grass and Bug. The check is a heuristic: a weakness list whose lines carry no weakness wording would not be caught, and a line that mixes a weakness and a resistance is not checked.
- **The opening must answer a direct question (added after the version 3 run).** String matching passed "Which Pokémon evolves into Charizard?" because "Charmeleon" appeared in the details, although the first sentence was wrong. For fact, base-form and judgment questions, every expected fact must now appear in the opening: the first paragraph after any heading, plus the list right after it when the paragraph ends with a colon, as in "Pikachu evolves into:". A heading is a title, so it is skipped. Questions that ask for a description, such as "Describe how Charizard evolves", are graded on their facts anywhere in the answer. This check lowered the earlier results to 31 of 40 for the baseline (was 32) and 33 of 40 for version 2 (was 37), because version 2 gave the species only in the details.
- **Evolution cases and citations (added with the evolution sentences).** The detail page question "Describe how {name} evolves", taken from the same setting the page uses (`ASK_EVOLUTION_QUESTION`), is asked for Charizard, Pikachu and Mewtwo with the same exact-name scope as the page. Each evolution sentence is on every page of its family, so "How does Pikachu evolve into Alolan Raichu?" accepts Pikachu's or Raichu's page as the citation.
- **Style counts, reported but not graded.** For each generated answer: the word count, whether it refers to "the documentation", "the following documentation", "the documents", "the sources" or "the provided content", and whether its first line is a sentence rather than a heading, a bold label or a list (direct answer first). Headings later in an answer are allowed, because the prompt asks for them in answers with several parts. Answers over 200 words are counted as long. 200 words is about what fits in the detail page bubble without scrolling (`ANSWER_STYLE_LIMITS` in `evals/answerEvals.ts`).

| Style count, November 9 baseline | Fact | Base form | Scoped | Judgment | All |
|---|---|---|---|---|---|
| Answers generated | 17 | 7 | 6 | 2 | 32 |
| Direct answer first | 0 | 0 | 0 | 0 | 0 |
| Refers to the documentation | 9 | 4 | 1 | 1 | 15 |
| Over 200 words | 1 | 0 | 2 | 2 | 5 |
| Median words | 23 | 18 | 58 | 215 | 26 |

The longest answer, 732 words, is "What is the difference between Charmander and Charmeleon?", which lists every field of both pages.

## Why these techniques

### Index quality: reference data from the same source

The reference comes from pokemondb.net, the site we index, so a different source cannot cause false failures. The weakness is that one extraction mistake could appear in both the reference and the index. Hand-checking the difficult pages, such as Nidoran♀, Type: Null and pages with many forms, reduces that risk. This follows the general advice to include edge cases in an eval set ([Anthropic, Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)).

### Relevance: a labelled query set with rank-based measures

A labelled test collection, with queries, known relevant items and a rank-based measure, is the standard way to evaluate a ranked search engine offline ([Manning, Raghavan and Schütze, *Introduction to Information Retrieval*, chapter 8](https://www.cambridge.org/highereducation/books/introduction-to-information-retrieval/669D108D20F556C5C30957D63B5AB65C/evaluation-in-information-retrieval/1DE7AC4EC9996792D8590212D735AF15)).

- **MRR** suits searches where a person wants one specific Pokémon, because it measures how high the first relevant result appears.
- **Recall@K** suits searches with many right answers, such as `fire` or `generation 3`, because it measures how many of them appear in the first K. K is 12, one results page, and 3, what fits at a glance.
- **Categories** show where the engine is weak. Overall MRR hides the fact that descriptive queries score 0.700 while names score 1.0.
- **Name-first rate** in the partial-name benchmark checks whether the top positions are all Char- names. MRR only sees the first relevant result, so it cannot detect a mixed order.

### Generated answers: graded by code, with human review where code cannot judge

The answer eval follows the documented preference for automatic grading, and uses human review only for what code cannot judge ([Anthropic, Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)).

- **Facts** are checked by string match, which is fast and repeatable.
- **Citations** must include an accepted pokemondb.net page, so an answer that is right by luck but grounded in the wrong page fails.
- **Unanswerable questions**, such as "What is the capital of France?", must produce no answer. This tests that the system declines instead of inventing an answer. Coveo states that RGA does not generate an answer when there is not enough relevant information ([RGA reports and UA events](https://docs.coveo.com/en/nb6a0210/)).
- **Scoped and judgment questions** pass or fail on what code can check, and are flagged for a person to read.

The main research approaches score faithfulness (are the answer's claims supported by the retrieved text?) and answer relevance with a language model as the grader ([Es et al., RAGAS, 2023](https://arxiv.org/abs/2309.15217)). Strong model graders agree with human preferences about as often as humans agree with each other, but they show position, length and self-preference biases ([Zheng et al., Judging LLM-as-a-Judge, NeurIPS 2023](https://arxiv.org/abs/2306.05685)). We did not add a model grader: our questions have short factual answers that string matching grades exactly, and a grader would itself need checking against human labels. It becomes worth adding for open questions in production.

### Performance: percentiles, measured before changing anything

- **Percentiles, not averages.** Latency is skewed, and an average hides the slow tail. Google's SRE book states: "We generally prefer to work with percentiles rather than the mean" ([Google SRE book, chapter 4](https://sre.google/sre-book/service-level-objectives/)). We report p50 and p95.
- **Targets come from the baseline.** Each target is the measured p95 plus 20%, rounded up. The aim is to catch a regression, not to promise a number to users. The SRE book warns against adopting current performance as a user-facing target without reflection, and recommends a tighter internal target than the one promised to users. Our targets are internal regression alarms.
- **Page experience uses Google's measures.** We record largest contentful paint (LCP) and cumulative layout shift (CLS), the Core Web Vitals. Google rates LCP of 2.5 s or less and CLS of 0.1 or less as good, at the 75th percentile of real page views ([web.dev, Defining the Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)). Our LCP (260 ms p50, 1,060 ms p95 from one slow run) and 0.035 CLS are inside these, though from lab runs, not real users.
- **Answers are judged by time to first text.** Answers stream, so the first words matter most. People keep their train of thought for about 1 second and their attention for about 10 seconds ([Nielsen Norman Group, Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)). First text at 2 to 3 seconds sits between these limits, which is why the interface shows a thinking state. This is our inference from the general guidance. Coveo publishes no latency figures for generated answers.
- **No change without evidence.** Coveo's [response time guide](https://docs.coveo.com/en/1948/) lists optimizations such as limiting results and simplifying pipelines. We applied none, because the measurements showed no problem for them to solve.

## Uncertainty

Our test sets are small, so each score has a margin of error. Treating eval questions as a sample from all possible questions, the standard error of a mean score is the standard deviation divided by the square root of the number of questions ([Miller, Adding Error Bars to Evals, Anthropic, 2024](https://arxiv.org/abs/2411.00640)). Computed from the saved reports:

| Score | Questions | Value | Standard error |
|---|---|---|---|
| Overall MRR | 123 | 0.947 | 0.017 |
| Descriptive MRR | 13 | 0.700 | 0.117 |
| Ability MRR | 15 | 0.900 | 0.053 |
| Answer pass rate, all (November 9, regraded) | 40 | 0.800 | 0.063 |
| Answer pass rate, facts (November 9, regraded) | 17 | 0.882 | 0.078 |
| Answer pass rate, base form (November 9) | 7 | 0.429 | 0.187 |
| Answer pass rate, all (prompt version 2) | 40 | 0.925 | 0.042 |

**What this means.**

- The overall MRR of 0.947 against a 0.95 target is a difference of 0.003, far inside one standard error. The data cannot tell whether we meet the target. The real, measurable weakness is descriptive queries. Their change from 0.717 to 0.700 after the rebuild is also far inside one standard error.
- The base-form pass rate has a wide margin, but the fix was expected to pass all 7 cases. Even at the upper end of one standard error, about 0.62, it is clearly short of that, so the base-form result is a real failure, not noise.
- Answer pass rates use the binomial standard error, sqrt(p(1-p)/n). Version 2 compared with the baseline case by case: 6 cases flipped to pass and 1 to fail, on the same 40 questions. The rise from 0.800 to 0.925 is about two standard errors, and the base-form cases moved from 3 to 7 of 7, which is the change the fix was built for.
- A boost or configuration change should be compared **query by query** on the same set, not by comparing two overall scores. A paired comparison removes the variation between easy and hard questions, so it detects smaller real differences ([Miller, 2024](https://arxiv.org/abs/2411.00640)). The partial-name benchmark already runs every setting on the same queries.
- The queries were written by us, not taken from real users, and some share a pattern. Questions that are not independent make the true error larger than this table shows ([Miller, 2024](https://arxiv.org/abs/2411.00640)).

## Known limits of the current evals

- **No real users.** The query set reflects what we expect people to type, not what they type.
- **One machine, one network.** Performance comes from a developer machine on a home network, with no CPU or network throttling.
- **Same source for reference and index.** Reduced, not removed, by hand checks.
- **String-match grading** can fail a correct answer that uses different wording, which is why some cases go to a person. The wrong-weakness check reads sentence wording, so it can miss a wrong weakness in a list with no weakness wording. The opening check finds the expected fact, not a wrong claim: an opening that gives the right fact next to a wrong one still passes.
- **Live evals are not in CI.** They need a second API key with a separate search hub and they use the generative answer allowance, so they run on demand. CI runs the unit and extension tests on every push.

## How we would evaluate in production

In production, offline evals stay as a regression gate, and real-user signals become the main measure of quality. Coveo provides most of what is needed.

### 1. Offline evals as a release gate

- Run index, relevance, answer and performance evals in CI before a configuration or code change is promoted, and on a schedule to catch content changes from recrawls.
- Fail the build when a score drops by more than its standard error allows, rather than on any small change.
- Keep growing the sets from production: add every failed query or disliked answer found in step 3 as a new case.
- Promote Coveo configuration between a test and a production organization with resource snapshots or the Coveo CLI, so the evaluated configuration is the one released ([Coveo, Manage an organization with resource snapshots](https://docs.coveo.com/en/3358/); [Migrate changes between organizations](https://docs.coveo.com/en/l3ge0200/)).

### 2. Online search quality from Coveo Analytics

Coveo documents these measures:

- **Clickthrough rate:** searches with at least one click, divided by all searches. **Average click rank:** the average position of clicked results; lower is better ([Query pipeline performance](https://docs.coveo.com/en/p47e0293/); [Average Click Rank](https://docs.coveo.com/en/2836/)).
- **Relevance Index:** combines clickthrough, click rank and query frequency into one score from 0 to 1. Coveo calls it a relative metric for comparing queries, and recommends sorting by ascending Relevance Index to find the most important issues first ([Relevance Index metric](https://docs.coveo.com/en/3318/); [Identify relevance issues](https://docs.coveo.com/en/2017/)).
- **Queries without results**, which reveal content gaps and missing synonyms ([Coveo Administration Console reports](https://docs.coveo.com/en/1674/)).

Clicks are useful but biased: people click higher results partly because they are higher. Clicks are more reliable as relative preferences than as absolute relevance labels ([Joachims et al., Accurately Interpreting Clickthrough Data as Implicit Feedback, SIGIR 2005](https://doi.org/10.1145/1076034.1076063)). Our inference: this is why Coveo's average click rank should be read together with frequency, as the Relevance Index does, and why low-traffic queries need care.

### 3. Generated answer quality

- **Usage events.** Coveo Analytics logs whether an answer was generated, citation clicks, likes and dislikes, copies and expand or collapse. The Generative Answering Performance dashboard template reports answer counts, clickthrough and top queries with and without answers. It needs the `c_answergenerated` custom dimension, plus the feedback dimensions such as `c_hallucinationFree` and `c_documented` for the feedback form ([RGA reports and UA events](https://docs.coveo.com/en/nb6a0210/); [Analyze RGA implementation performance](https://docs.coveo.com/en/p5dc1316/)). Atomic already sends these events; the dimensions would need to be created.
- **Feedback review and root cause.** Coveo's Knowledge Hub gathers thumbs-up and thumbs-down feedback in the Answer Manager, and its Chunk Inspector shows the text passages an answer was built from. Coveo states that feedback alone "doesn't offer insights that you can use to improve" and recommends inspecting the chunks, then creating answer rules, changing content, or adjusting the configuration ([Evaluate generated answers](https://docs.coveo.com/en/p5db0063/); [Inspect RGA chunks](https://docs.coveo.com/en/p5dc0110/)). The Knowledge Hub is a beta for early-access customers, so availability must be confirmed.
- **Sampling.** Feedback comes from few users and leans negative. A person should also review a random sample of answers each week, plus all disliked answers, and a model grader can pre-screen a larger sample for unsupported claims. This is our recommendation, based on the RAGAS and LLM-as-a-judge findings above. The grader is checked against those human reviews before it is trusted.

### 4. Controlled experiments before rollout

- Coveo's query pipeline A/B test splits traffic by client ID between the original pipeline and a test scenario. It compares average result rank, search clickthrough, average number of results, and queries without results ([Manage A/B tests](https://docs.coveo.com/en/3255/)).
- Coveo's recommendations: make one subtle change at a time, confirm statistical significance, exclude extreme users such as internal testers, roll out gradually, and stop an inconclusive test after two to three weeks.
- General practice agrees: decide the main success metric before the test, and plan sample size and test length for the effect you want to detect ([Kohavi, Tang and Xu, *Trustworthy Online Controlled Experiments*, Cambridge University Press, 2020](https://doi.org/10.1017/9781108653985)).
- For ranking changes with little traffic, interleaving, which mixes results from both rankings in one list and counts which side gets clicks, needs far less traffic than a split test ([Chapelle et al., ACM TOIS, 2012](https://doi.org/10.1145/2094072.2094078)). We found no Coveo feature for interleaving, so this is a research reference, not a Coveo option.

### 5. Production performance

- Measure real users in the browser (real-user monitoring) and report Core Web Vitals at the 75th percentile, as Google does ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)).
- Watch Coveo's own figures: the Query Pipelines page shows average response time and query volume per pipeline ([Query pipeline performance](https://docs.coveo.com/en/p47e0293/); [Search response time](https://docs.coveo.com/en/1948/)).
- Set service level objectives from real-user data, with an internal target tighter than the one promised to users ([Google SRE book](https://sre.google/sre-book/service-level-objectives/)).
- Plan any load test with Coveo first, as required ([Search response time](https://docs.coveo.com/en/1948/)).

### 6. Risk management for the generative feature

For a client with compliance needs, NIST's Generative AI Profile is a recognized, voluntary framework for measuring and managing generative AI risks such as confabulation, meaning confident wrong answers. It organizes actions under Govern, Map, Measure and Manage ([NIST AI 600-1](https://doi.org/10.6028/NIST.AI.600-1)). Our unanswerable-question cases, citation checks and disclaimer are small examples of the Measure and Manage actions.

## Talking points

- Every eval runs against live Coveo with the shipped request body, with analytics capture off.
- Targets come from measured baselines. We changed nothing for performance, because the numbers did not justify it.
- The 0.95 MRR target is not met at 0.947, but the gap is inside the margin of error. The measurable weakness is descriptive queries.
- Answers are graded by code for facts, citations and declining to answer, and a person reviews what code cannot judge.
- The grader was made stricter when it passed a wrong opening sentence, and older reports were regraded, so the score went down rather than hiding the error. Known answer failures are documented as the next iterations, to be prioritised with production feedback.
- In production, Coveo Analytics, the Generative Answering Performance dashboard, the Knowledge Hub and pipeline A/B tests provide the online measures, with offline evals kept as a release gate.

## Sources

**Coveo documentation**

| Page | Supports |
|---|---|
| [Search response time](https://docs.coveo.com/en/1948/) | Load tests need Coveo authorization; optimization checklist; where response time is shown |
| [Query pipeline performance](https://docs.coveo.com/en/p47e0293/) | Clickthrough rate, average click rank and response time per pipeline; A/B test for longer comparisons |
| [Average Click Rank](https://docs.coveo.com/en/2836/) | Definition of average click rank |
| [Relevance Index metric](https://docs.coveo.com/en/3318/) | How the Relevance Index is computed and its thresholds |
| [Identify relevance issues](https://docs.coveo.com/en/2017/) | Workflow for finding low-relevance queries |
| [Coveo Administration Console reports](https://docs.coveo.com/en/1674/) | Reports and dashboards, including queries without results |
| [Manage A/B tests](https://docs.coveo.com/en/3255/) | Pipeline A/B test method, metrics and recommendations |
| [RGA reports and UA events](https://docs.coveo.com/en/nb6a0210/) | Events logged for generated answers; dashboard template; custom dimensions |
| [Analyze RGA implementation performance](https://docs.coveo.com/en/p5dc1316/) | Generative Answering Performance dashboard |
| [Evaluate generated answers](https://docs.coveo.com/en/p5db0063/) | Feedback plus chunk inspection workflow in the Knowledge Hub |
| [Evaluate generated answers and improve your RGA implementation](https://docs.coveo.com/en/oa2d0178/) | Evaluate before and after production |
| [Inspect RGA chunks](https://docs.coveo.com/en/p5dc0110/) | Chunk Inspector |
| [View feedback for generated answers](https://docs.coveo.com/en/p5db0180/) | Answer Manager feedback; needs an answer configuration |
| [Manage an organization with resource snapshots](https://docs.coveo.com/en/3358/) and [Migrate changes between organizations](https://docs.coveo.com/en/l3ge0200/) | Promoting tested configuration |

**Other sources**

| Source | Supports |
|---|---|
| Manning, Raghavan and Schütze, [*Introduction to Information Retrieval*, chapter 8](https://www.cambridge.org/highereducation/books/introduction-to-information-retrieval/669D108D20F556C5C30957D63B5AB65C/evaluation-in-information-retrieval/1DE7AC4EC9996792D8590212D735AF15), Cambridge University Press, 2008 | Test collections and ranked retrieval measures |
| Miller, [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640), Anthropic, 2024 | Standard errors, paired comparisons, clustered questions, sample size |
| Anthropic, [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) | Task-specific evals with edge cases; automatic grading first |
| Es et al., [RAGAS](https://arxiv.org/abs/2309.15217), 2023 | Faithfulness and answer relevance for retrieval-based answers |
| Zheng et al., [Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685), NeurIPS 2023 | Model graders: agreement with humans and known biases |
| Joachims et al., [Accurately Interpreting Clickthrough Data as Implicit Feedback](https://doi.org/10.1145/1076034.1076063), SIGIR 2005 | Clicks are informative but biased by position |
| Chapelle et al., [Large-Scale Validation and Analysis of Interleaved Search Evaluation](https://doi.org/10.1145/2094072.2094078), ACM TOIS, 2012 | Interleaving as an efficient online comparison |
| Kohavi, Tang and Xu, [*Trustworthy Online Controlled Experiments*](https://doi.org/10.1017/9781108653985), Cambridge University Press, 2020 | A/B test design and analysis |
| Beyer et al., [*Site Reliability Engineering*, chapter 4](https://sre.google/sre-book/service-level-objectives/), Google, 2016 | Percentiles over averages; choosing targets |
| Google, [Defining the Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) | LCP, INP and CLS thresholds at the 75th percentile |
| Nielsen, [Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/), Nielsen Norman Group | 0.1, 1 and 10 second limits |
| NIST, [AI 600-1 Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1), 2024 | Framework for measuring and managing generative AI risk |
