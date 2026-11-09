# Passage Retrieval: Point of View

This document explains Coveo Passage Retrieval (CPR), when to use it instead of the Search API or Relevance Generative Answering (RGA), and how we would use it in future work. It was written for the Pokémon search application, which searches an index of 1,028 Pokémon pages from pokemondb.net.

**Status: nothing here has been tested.** Passage Retrieval is a [paid product extension](https://docs.coveo.com/en/oaie5277/) and is not enabled in our organization. Everything below comes from the Coveo documentation, read in November 2026, or from our reasoning. Each section separates the two.

## Summary of our view

Use Passage Retrieval when **we control the language model, the prompt and the display**, and need Coveo to supply trustworthy text for them.

| Need | Tool |
|---|---|
| People browse and compare ranked items | Search API |
| A generated answer inside a Coveo search interface, with Coveo managing the prompt and the model | RGA |
| Text to ground an LLM application or agent that we build or connect | Passage Retrieval API |

The value of Passage Retrieval is that retrieval still runs through the query pipeline, with the same content, permissions and most relevance rules as search. The cost is that we are then responsible for everything after retrieval: the prompt, the LLM, the citations, the quality checks and the guardrails.

For this application, RGA is the right tool for answers in the search page. Passage Retrieval fits best where an LLM outside Coveo needs the Pokémon index. One example is sketched at the end of this document as a concept only. It is not planned work.

## How it works

### What Coveo states

**Purpose.** A CPR model [retrieves the passages most relevant to a query](https://docs.coveo.com/en/oaie5277/) from indexed content. In a retrieval-augmented generation (RAG) system, those passages are given to an LLM to ground its output.

**Required parts.** An implementation [must include a CPR model and a Semantic Encoder (SE) model](https://docs.coveo.com/en/oaoe7068/) that use the same content and are associated with the same query pipeline. Coveo [recommends one CPR model per pipeline](https://docs.coveo.com/en/oaie6403/).

**Content.** The model [embeds only the `body` field](https://docs.coveo.com/en/oaie5476/). Text that exists only in `title` or other fields is not considered during passage retrieval. A query that matches only a `title` won't retrieve passages from that item [unless the body is semantically relevant](https://docs.coveo.com/en/oaod5329/). Each item needs a unique `permanentid`, which standard sources provide, and HTML is a supported file type. Models rebuild weekly, and content retrieval is English only by default, with beta support for other languages.

**Content guidance.** Coveo [recommends](https://docs.coveo.com/en/oaod5329/) shorter documents focused on one topic, content designed to answer questions, a reasonably sized dataset, and avoiding multiple documents with similar content. Boilerplate should be removed from the body at indexing.

**Chunking.** Models created since October 2025 [use structure-aware chunking by default](https://docs.coveo.com/en/oaie5476/), and Coveo recommends it for LLM and RAG systems. Chunks average 400 tokens, with a minimum of 200 and a maximum of 500. An item can produce up to 1,000 chunks by default.

**Retrieval has two stages**, as described in [About Coveo Passage Retrieval](https://docs.coveo.com/en/oaie5277/):

1. **First stage, items.** The query passes through the query pipeline. Lexical search and the SE model's vector search find the most relevant items.
2. **Second stage, passages.** The CPR model searches its embeddings for the most similar passages, considering only the items from the first stage.
3. **Score fusion.** Reciprocal Rank Fusion adjusts passage ranking using the relevance of the source item, so lexical, behavioral and business-rule signals are not lost. It is on by default for new models.
4. **Passage merging.** With structure-aware chunking, nearby passages from the same item are merged, up to 10 at a time. Coveo warns that this can raise the average tokens per passage by up to 25% and the maximum by up to 200%.

The second stage considers [40 items by default, and up to 100](https://docs.coveo.com/en/oaie6403/), through the `numberOfDocumentsToConsider` association parameter. Passages must also [meet a minimum relevancy threshold](https://docs.coveo.com/en/oaod5329/). If none do, no passages are made available to the LLM application, so a client must handle an empty result.

Content permissions are [enforced during retrieval](https://docs.coveo.com/en/oaie5277/).

**The API.** Clients send a [POST request](https://docs.coveo.com/en/o86c8334/) to:

```http
POST https://<ORGANIZATION_ID>.org.coveo.com/rest/search/v3/passages/retrieve
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

| Request property | Meaning |
|---|---|
| `query` (required) | The basic query expression |
| `searchHub` (required in the body or the token) | The interface sending the request. [The API reference](https://docs.coveo.com/en/13/) says a search token that enforces a pipeline or a routing search hub overrides it |
| `localization.locale` (required) | The locale of the search |
| `filter` | A filter expression [applied during first-stage retrieval](https://docs.coveo.com/en/13/), such as one limiting the source |
| `pipeline` | A pipeline for the request, listed in the [API reference](https://docs.coveo.com/en/13/). The usage guide does not describe it |
| `additionalFields` | Up to 20 more document fields in the response |
| `maxPassages` | From 1 to 20 |
| `context` | Custom key-value context |
| `analytics` | Options including `capture`, `clientId` and `userAgent` |

The response contains `items`, each with the passage `text`, a `relevanceScore` based on cosine similarity, and the source `document`, which includes its title and `primaryid` by default. It also has a `responseId` for logs. Passages are sorted by descending relevance, and the [total response is limited to 540 KB](https://docs.coveo.com/en/o86c8334/). The [reference](https://docs.coveo.com/en/13/) describes the score as ranging from -1 (semantic opposite) through 0 (not similar) to 1 (similar), and warns that the computation and range may change. It also lists a separate debug endpoint, `/rest/search/alpha/passages/retrieve/debug`, which is in alpha. The API returns 400, 401, 403, 422, 429, 500 and 503 errors, so a client must handle rate limiting and outages.

**Authentication.** The API [accepts OAuth 2.0, API keys, platform tokens and search tokens](https://docs.coveo.com/en/o86c8334/). The [API reference](https://docs.coveo.com/en/13/) lists one required privilege for the operation, `EXECUTE_QUERY`. The [Anonymous search key template](https://docs.coveo.com/en/1718/) includes **Execute queries: Allowed**.

**Query pipeline support is partial**, per the [feature support table](https://docs.coveo.com/en/o86c8334/):

| Feature | Support |
|---|---|
| Filters, ranking weights, result ranking, featured results | Supported |
| Conditions | Partial: `Referrer`, `Recommendation` and `FacetsFilter` conditions are not supported |
| Stop words and thesaurus | Stop words are supported. Thesaurus needs the model association option |
| Machine learning | Only Automatic Relevance Tuning (ART) |
| A/B tests, triggers | Not supported |

**What Coveo does not do.** Coveo [does not manage the prompt sent to the LLM or the component that displays the output](https://docs.coveo.com/en/oaoe7068/).

### Our inference

- Our existing `pokebowl-search` pipeline should work. Its condition is on the search hub and its filter is a supported feature.
- By its privileges, the `pokebowl-search-browser` key should be able to call this API. A public key would only be used for public content like ours.
- Passage quality depends on our `body` field, as RGA does. Pokémon pages are short and each covers one Pokémon, which fits Coveo's guidance. They are reference data and not written to answer questions, which does not. Our indexing rewrites stat tables and Type grids as sentences, because Coveo warns that table text parses unpredictably. Whether this is enough has not been measured.
- Alternate forms are already kept in one item per Pokémon, which follows the advice to avoid similar documents.
- Merging makes passage size less predictable, so a client should budget prompt space from measured sizes and not assume 400 tokens per passage.

## When to use it

### What Coveo states

CPR is [required for two workflows](https://docs.coveo.com/en/oaie5277/): generating answers with the Coveo Search Agent, and powering a custom RAG application through the Passage Retrieval API. An RGA model, by contrast, [generates answers for queries in a Coveo-powered search interface](https://docs.coveo.com/en/nb6a0104/) and is displayed by the RGA component.

### Our comparison

The first three rows are facts from the Coveo documentation. The last three are our judgment.

| Question | Search API | RGA | Passage Retrieval API |
|---|---|---|---|
| What comes back? | Ranked items | A generated answer with citations | Ranked text passages |
| Who writes the answer? | Nobody | Coveo's answer generation | The LLM we choose |
| Who controls the prompt? | Not applicable | Coveo, with an optional added instruction | We do |
| Effort to add | Already in place | Models are built; the application needs the answer component | A server, an LLM account, prompts, citations and evals |
| Best for | Browsing, filtering, known names | Questions asked on the search page | Agents, chat, or use cases needing a specific model or output format |
| Main risk | People must read the pages | Limited control | Quality and safety depend on what we build |

We would **not** choose Passage Retrieval just to show answers on a search page. RGA does that with less to build and maintain. We would choose it when an application needs one of the following:

- A specific LLM, for reasons such as cost, data residency or an existing contract.
- Output that is not a prose answer, such as a structured comparison.
- Several retrieval steps inside an agent's reasoning.
- Grounding inside a product that is not a search page.

## How we would use it

### First setup

Once access is enabled (PC-02), PC-80 would:

1. Create one CPR model limited to the `pokemondb-pokemon` source, with the default structure-aware chunking.
2. Associate it with `pokebowl-search`, which already has the Semantic Encoder. Coveo states that [the same SE model and pipeline can serve both RGA and CPR tools](https://docs.coveo.com/en/q1mb0212/).
3. Send a test request with a separate search hub starting with `pokebowl-`, for example `pokebowl-passages`. It would route to the pipeline and keep this traffic separate from the application's analytics. This needs a second key, because the browser key enforces the `pokebowl-search` hub.

Define expected results before testing, as for all our configuration. For example, "what abilities does Charizard have?" should return a passage from the Charizard page containing its abilities, and an unrelated question should return no passages, or only low-scoring ones.

One difference to plan for: number-only searches are rewritten by a hook in the browser application, so they would not apply to Passage Retrieval requests.

### In production

For a client product, we would add:

- **Evals over time:** a reference set of questions and expected source pages, with scores for passage relevance and for how well answers stay grounded.
- **Tuning by evidence:** change the number of items considered, the chunk limit or thesaurus use only after evals show a problem. Coveo warns that [changing association defaults may cause unintended behavior after a model upgrade](https://docs.coveo.com/en/oaie6403/).
- **Permissions:** search tokens or OAuth for private content, so retrieval respects each person's access.
- **Monitoring:** log each `responseId`, passage count, token count and latency. Coveo notes that [performance falls as passages per document rise](https://docs.coveo.com/en/o86c8334/), which is why the baseline must be measured.
- **Safety:** treat retrieved text as data in the prompt, not as instructions, and require citations.

## Concept only: the index as an agent tool

This is an idea for discussion, not planned work.

**What Coveo states.** The [Hosted MCP Server](https://docs.coveo.com/en/pboe0358/) lets LLM applications call Coveo Search, Fetch, Answer and Passage Retrieval tools without custom integration. [Search and Fetch work with any query pipeline, and Passage Retrieval needs CPR and SE models on it](https://docs.coveo.com/en/q1mb0212/). [An Anonymous API key is recommended for public sources](https://docs.coveo.com/en/q1mb0212/), and Coveo [lists the clients it has tested](https://docs.coveo.com/en/pbog0163/), such as Claude Desktop, Cursor and Visual Studio Code.

**Our inference.** An MCP server on `pokebowl-search` could let an AI client do multi-step work that a search page cannot, such as choosing a team to cover a Pokémon's weaknesses, with no server or LLM credential for us to manage.

## Not confirmed

- Whether the browser key works in practice. The documented privilege matches, but nothing has been called. The "Allow content preview" privilege in the [usage guide](https://docs.coveo.com/en/o86c8334/) is listed for the model, and we did not confirm what, if anything, it means for a key.
- Latency, passage quality and passage size on our content. These need access and measurement.
- The value of the minimum relevancy threshold. Coveo does not publish it.
- Whether Passage Retrieval is licensed for this organization once requested.
- The input arguments of the Hosted MCP Passage Retrieval tool. Coveo's MCP pages do not list them.
