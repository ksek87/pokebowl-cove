# Coveo configuration

Copies of the configuration applied in the Coveo Administration Console. The console is where changes are made, so update these files whenever a setting changes. These files must never contain API keys or other secrets.

| File | Contents | Format |
|---|---|---|
| `web-scraping.json` | Page exclusions and metadata selectors | Exact JSON pasted into the source's web scraping configuration |
| `fields.json` | Index fields, their mapping rules and options, including **Sort** on `pokemon_name` and `pokemon_number` | Our record of the console settings, not a Coveo import format |
| `fields-batch-create.json` | Detail-page fields | Request body for Coveo's batch field creation API |
| `full-source.json` | Settings of the full Pokémon source | Our record of the console settings, not a Coveo import format |
| `extensions/reconstruct_body.py` | Pre-conversion extension that rewrites data tables, stat tables and type grids as sentences that name each form | Exact script pasted into the `pre-reconstruct-body` extension, which requests only **Original file** item data. It also writes the evolution chart as one sentence per step. Tests are in `test_reconstruct_body.py`, `test_form_sentences.py` and `test_evolution_sentences.py` |
| `query-pipeline.json` | The `pokebowl-search` query pipeline, its condition and filter rule | Our record of the console settings, not a Coveo import format |
| `ml-models.json` | The Semantic Encoder and RGA models, their content and pipeline association | Our record of the console settings, not a Coveo import format |
| `rga-prompt-instruction.txt` | Custom prompt instruction for the RGA model (Edit model, Configuration, Prompt enhancement, Prompt instruction). Coveo adds it to the base prompt, limits it to 2,000 characters and rebuilds the model on save ([Create and manage RGA models](https://docs.coveo.com/en/nb6a0085/)) | Version 3, applied by the user on 2026-11-10 with the evolution sentence rollout. Adds "answer exactly what was asked; state a single asked attribute, such as species, first", and trims wording to stay under 2,000 characters (1,913). Measured at 38 of 45 answer evals |
| `rga-prompt-instruction-v2.txt` | Version 2, applied on 2026-11-10: required the Key details section and stopped references to the sources. Measured at 37 of 40 answer evals | Record only |
| `rga-prompt-instruction-v1.txt` | Version 1 of the instruction, applied earlier on 2026-11-10 and replaced the same day | Record only |
| `rga-prompt-instruction-template.txt` | The default template Coveo shows when Prompt instruction is first turned on, copied from the console on 2026-11-10. It is a starting point to adapt, not Coveo's base prompt, which is not shown. Our instruction replaces it | Record only, not applied |
| `query-suggestions-default-queries.csv` | Suggestion candidates for the Query Suggestions model: Pokémon names, Types, Generations, Type pairs, abilities and species | File for upload through the Advanced Model Configurations API as `DEFAULT_QUERIES` for `en`. Coveo has the first version, without importance values, until the ranked version is uploaded. Generated, do not edit by hand |
| `api-keys.json` | Settings of the browser search key, without its value | Our record of the console settings, not a Coveo import format |
| `test-source.json` | Settings of the single-Pokémon test source | Our record of the console settings, not a Coveo import format |

| `export/` | Snapshot of the live organization, pulled with the Coveo CLI on 2026-11-12 (see below) | Coveo CLI project: `.coveo/config.json` and one JSON file per resource type in `resources/`. Generated, do not edit by hand |

These files record the intended settings and do not prove what is live in Coveo. After applying a setting, confirm it in the console or through a query. The first full crawl ran without `performFieldMappingUsingAllOrigins` and without the Facet option on `pokemon_generation`, although both were recorded here.

The reasons behind these settings are recorded in [docs/architecture.md](../../docs/architecture.md).

## Query Suggestions default queries

The application has no real search history, so the Query Suggestions model starts from a [default queries file](https://docs.coveo.com/en/qa5b0256/), the method Coveo documents for test and low-traffic environments. The file holds Pokémon names, Types, Generations, Type pairs that exist in the data, abilities and species. All values come from the index.

The second column is the optional integer importance value. It ranks categories only, because we have no real query counts: Pokémon names 1000, Types and Generations 500, Type pairs 200, abilities and species 100. The weights are defined once in `src/tooling/defaultQueries.ts`. Coveo does not document how the size of the gap between values affects ranking.

To regenerate it after the index changes:

```sh
node --env-file=.env scripts/generate-default-queries.ts
```

The script reads every item once and then runs each query other than names against the `pokebowl-search` pipeline. It drops any query with no matching result in the top results. All of its requests set `analytics.capture` to `false`, so they do not reach the analytics that train models. The file must stay within Coveo's limit of 5,000 queries per language, and the script fails if it does not.

## Organization export

`export/` is the final configuration as it is live in Coveo. It was pulled on 2026-11-12 with Coveo CLI 3.3.1 on Node 24:

```sh
npm install -g @coveo/cli@3.3.1
coveo auth:login -r us -o <organization ID>
cd configs/coveo/export
coveo org:resources:pull --no-git
```

`pull` creates a resource snapshot in the organization and writes it to the current folder ([Manage organization snapshots](https://docs.coveo.com/en/mape0408/)). Use 3.3.1 or later on Node 24: its release notes fix an expired-token error right after login on Node 24. To apply the export to another organization, run `coveo org:resources:preview` and then `coveo org:resources:push -o <destination organization ID>` from `export/`.

**What it contains:** the two sources with their settings, the `pre-reconstruct-body` extension, 90 fields and 112 mappings, the `default` and `pokebowl-search` query pipelines, the search hub condition and filter rule, the Query Suggestions model and its association, and the analytics tracking ID. The exported extension code matches `extensions/reconstruct_body.py` (the live copy has one extra blank line at the end).

**What it does not contain:**

- **The Semantic Encoder and RGA models, and their associations.** Snapshots support only Automatic Relevance Tuning, Query Suggestions and Content Recommendation models ([Manage resource snapshots](https://docs.coveo.com/en/3239/)). `ml-models.json` and the `rga-prompt-instruction*.txt` files remain the record for these two models. The condition RGA's association uses, `when not ( $query isEmpty )`, is in the export, because conditions are a supported resource.
- **API keys.** They are not a supported snapshot resource ([Manage resource snapshots](https://docs.coveo.com/en/3239/)). `api-keys.json` remains the record.
- **Secrets.** Snapshots do not carry sensitive information such as source credentials ([Manage organization snapshots](https://docs.coveo.com/en/mape0408/)). We checked the export: no parameter is marked sensitive, and it contains no key or token values. Our sources crawl a public site and have no credentials.

**Checked against our records on 2026-11-12:** the 16 Pokémon fields and their options match `fields.json`. The web scraping configuration is identical to `web-scraping.json`. The full source matches `full-source.json`: sitemap address, URL rule, 2,000 ms between requests, JavaScript off, the extension set to skip on error, and `performFieldMappingUsingAllOrigins`. The `pokebowl-search` pipeline, its search hub condition and its filter rule match `query-pipeline.json`.

The pull leaves the snapshot in the organization. Coveo keeps up to 20 snapshots and deletes each one 6 months after it is created ([Manage resource snapshots](https://docs.coveo.com/en/3239/)).
