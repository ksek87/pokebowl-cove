# Architecture

## Solution flow

This diagram shows the components of the solution and how they connect. Choices that are still open are marked "TBD".

```mermaid
flowchart TD
    subgraph CONTENT["Content: pokemondb.net"]
        PAGES["Pokémon pages<br/>/pokedex/name"]
        OTHER["Everything else<br/>moves, types, list pages"]
    end

    subgraph INGEST["Coveo indexing"]
        SOURCE["Coveo Sitemap source"]
        FILTERS["URL filtering<br/>keeps only Pokémon pages"]
        SCRAPE["Content extraction<br/>removes page clutter, captures metadata"]
        MAP["Mappings<br/>metadata to fields"]
    end

    subgraph INDEX["Coveo index"]
        ITEMS["One item per Pokémon<br/>title, URL, body"]
        FIELDS["Custom fields<br/>Type, Generation, image"]
    end

    subgraph ML["Coveo Machine Learning models"]
        SE["Semantic Encoder<br/>vector retrieval"]
        RGA["RGA<br/>generated answers"]
        QS["Query Suggestions<br/>type-ahead"]
        CPR["Passage Retrieval model<br/>bonus"]
    end

    subgraph QUERY["Coveo query layer"]
        PIPELINE["Query pipeline<br/>applies rules and models"]
        SEARCHAPI["Search API"]
        PRAPI["Passage Retrieval API<br/>bonus"]
        ANALYTICS["Coveo Analytics<br/>searches and clicks"]
    end

    subgraph APP["Search app: Atomic React, hosting TBD"]
        BOX["Search box with type-ahead"]
        ANSWER["Generated answer"]
        FACETS["Type and Generation facets"]
        RESULTS["Results with Pokémon pictures"]
        DETAIL["Pokémon detail page"]
        BONUS["Passage Retrieval feature<br/>bonus, concept TBD"]
    end

    SEED["Query Suggest preload<br/>approach TBD"]

    PAGES --> SOURCE
    OTHER -. "excluded" .-> FILTERS
    SOURCE --> FILTERS
    FILTERS --> SCRAPE
    SCRAPE --> MAP
    MAP --> ITEMS
    MAP --> FIELDS

    ITEMS -->|"body embedded"| SE
    ITEMS -->|"body embedded"| RGA
    ITEMS -->|"body embedded"| CPR

    SE --> PIPELINE
    RGA --> PIPELINE
    QS --> PIPELINE
    CPR --> PIPELINE

    ITEMS --> PIPELINE
    FIELDS --> PIPELINE
    PIPELINE <--> SEARCHAPI
    PIPELINE <--> PRAPI

    SEARCHAPI <--> BOX
    SEARCHAPI --> ANSWER
    SEARCHAPI <--> FACETS
    SEARCHAPI --> RESULTS
    SEARCHAPI --> DETAIL
    RESULTS -->|"select a Pokémon"| DETAIL
    PRAPI <--> BONUS

    BOX -. "search events" .-> ANALYTICS
    RESULTS -. "click events" .-> ANALYTICS
    SEED -. "preload data" .-> ANALYTICS
    ANALYTICS -->|"trains"| QS
```

## Decisions

### Search interface: Atomic React

We will start with Coveo Atomic through its React wrapper. Atomic provides maintained components for search, facets, type-ahead and generated answers, which keeps the amount of custom interface code small.

The main cost is less control over appearance, because styling is limited to theming and the style hooks each component exposes. We considered building on Coveo Headless with our own components. That offers complete control but takes longer and adds more custom code to maintain. We can revisit this decision if Atomic proves too limiting.

**Coveo documentation:** [Atomic](https://docs.coveo.com/en/atomic/latest/), [Atomic React wrapper](https://docs.coveo.com/en/atomic/latest/usage/frameworks/atomic-react-wrapper) and [Headless](https://docs.coveo.com/en/headless/latest/). Atomic is built on Headless, and the comparison of effort between them is our own judgment.

### Technology stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Application | React and Vite |
| Search interface | `@coveo/atomic-react` |
| Custom interface | shadcn/ui and Tailwind |
| Unit and component tests | Vitest and React Testing Library |
| Browser tests | Playwright |
| Evals and data scripts | TypeScript run with Node |
| CI/CD | GitHub Actions |
| Coveo configuration export | Coveo CLI |
| Hosting | To be decided |

We use one language so the project has a single toolchain. We considered Python for evals, mainly for its LLM evaluation libraries. We do not need those libraries because answers are checked against expected facts and citations. Eval speed depends on Coveo's API response times, so the language does not affect performance.

### Eval reference data

Reference data comes from pokemondb.net, the same site we index. A different source could disagree on types, forms or generations and produce false failures.

Because the reference data and the index share a source, the same extraction mistake could affect both. We reduce that risk by verifying difficult cases by hand. Raw HTML stays out of the repository, and only small derived reference data is committed.

### Content scope

The index contains every individual Pokémon page on pokemondb.net, including the newest Pokémon whose pages are still incomplete. Moves, types, list pages such as `all`, `national` and `shiny`, and all other site content are excluded. New Pokémon may have little body text and only a few entries under their Generation.

### Coveo source: Sitemap

We index with a Coveo Sitemap source because we already know exactly which pages we want and the site publishes a list of them. A Sitemap source visits only URLs listed in the sitemap and does not follow links. A Web source starts from one or more URLs and discovers pages by following links.

The sitemap covers the whole site and lists 12,923 URLs. URL rules narrow these to 1,028 individual Pokémon pages: the 1,025 numbered Pokémon and 3 new Generation 10 Pokémon that do not have numbers yet. Coveo applies the same rules to the sitemap URL, so the rules must explicitly include it.

**Benefits**

- **Less complexity:** there is no link traversal to reason about, so the result does not depend on how the site links its pages.
- **No starting-page problem:** a Web source's starting URLs must pass its own filters. A list page used as a starting point would therefore be indexed, unless we supplied all 1,028 Pokémon URLs as starting URLs.
- **Verifiable outcome:** the expected item count is known, so a full crawl can be checked against it.

**Performance**

The performance gain is limited to crawling. Avoiding link traversal means the crawler does not need to visit pages only to discover links. Both source types are bound by the same crawl delay on the pages we index: 2 seconds between requests, as the site's `robots.txt` asks, or about 35 minutes for a full crawl. This estimate assumes Coveo requests only pages that pass the URL rules. The source type has no effect on search latency, which depends on the index and query pipeline.

**Alternatives considered**

- **Web source:** this is the better option when pages must be discovered or when one page must be split into sub-items. We need neither.
- **Push source:** this gives the most control over body text, but we would have to build and maintain our own scraper.

**Coveo documentation**

- [Add a Sitemap source](https://docs.coveo.com/en/1967/): a Sitemap source crawls only listed pages, URL rules also apply to sitemap URLs, and the default delay between requests is 1,000 ms.
- [Add a Web source](https://docs.coveo.com/en/malf0160/): starting URLs are subject to the source's filters.
- [Sitemap source web scraping](https://docs.coveo.com/en/mahe0350/): Sitemap sources do not support sub-items.

The conclusions about complexity, the small crawl performance gain and the absence of any effect on search latency are our own reasoning. The Coveo documentation does not compare the two source types on these points.

### Test source configuration

The source `pokemondb-test-charizard` indexes one page so that configuration can be tested without a full crawl. Charizard is used because its Mega forms have different Types and expose extraction mistakes.

| Setting | Value | Reason | Basis |
|---|---|---|---|
| Sitemap URLs | `https://pokemondb.net/static/sitemaps/pokemondb.xml` | This field expects the sitemap file itself. A normal web page can be read as an HTML sitemap, causing its links to be crawled. | [Add a Sitemap source](https://docs.coveo.com/en/1967/) |
| Exclusion rule | Regex excluding every URL except the sitemap and Charizard | URL rules apply to sitemap URLs as well as pages, so the sitemap must stay allowed. | [Add a Sitemap source](https://docs.coveo.com/en/1967/). Using a single exclusion regex is our own approach because the console offered only exclusion rules. |
| Include all non-excluded pages | On | Provides the inclusion rule every URL must match, leaving the exclusion regex to narrow the result. | [Add a Sitemap source](https://docs.coveo.com/en/1967/) |
| Time between requests | 2,000 ms | The site's [robots.txt](https://pokemondb.net/robots.txt) asks for a 2-second delay. Coveo's default of 1,000 ms is faster than that. | Coveo default: [Add a Sitemap source](https://docs.coveo.com/en/1967/). The choice to follow robots.txt is ours. |
| Execute JavaScript on pages | Off | Coveo advises enabling this only for content rendered by JavaScript, and it can slow crawling. We confirmed that the Type and Generation markup is in the page's HTML. | [Add a Sitemap source](https://docs.coveo.com/en/1967/) and inspection of the Charizard page |
| Web scraping | Default for the first build | Establishes a baseline before extraction is changed, so each change can be evaluated separately. | Our own approach |
| Content visibility | Everyone | The content is public and the application has no user sign-in. | Our own decision |

### One item per Pokémon

Each Pokémon page becomes one item. Alternate forms such as Mega Evolutions appear as tabs on the same page, sometimes with a different Type. Type, image and other structured values are read only from the first tab, which is the base form. Charizard is therefore Fire and Flying, even though Mega Charizard X is Fire and Dragon. Alternate-form details remain in the body text, so they can still be searched and used in generated answers.

The cost is that users cannot filter by alternate form. We considered separate items for each form, but they create near-duplicate content that weakens generated answers.

**Coveo documentation:** [RGA content requirements](https://docs.coveo.com/en/nb6a0008/) recommends avoiding near-duplicate documents and notes that only the body field is embedded. Applying that guidance to alternate forms is our own inference.

### Generation extraction

Each page states the Generation in a dedicated tag within its introduction, for example "introduced in Generation 1". We read it with a web scraping selector. This avoids an indexing pipeline extension, which would add a moving part without providing any benefit here.

**Coveo documentation:** [Web scraping configuration](https://docs.coveo.com/en/mc1f3573/) describes CSS and XPath 1.0 selectors for extracting metadata, and states that extracted metadata needs fields and mappings before it can be used. The selector itself still has to be proven against the test source.
