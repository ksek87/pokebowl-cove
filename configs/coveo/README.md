# Coveo configuration

Copies of the configuration applied in the Coveo Administration Console. The console is where changes are made, so update these files whenever a setting changes. These files must never contain API keys or other secrets.

| File | Contents | Format |
|---|---|---|
| `web-scraping.json` | Page exclusions and metadata selectors | Exact JSON pasted into the source's web scraping configuration |
| `fields.json` | Index fields, their mapping rules and options, including **Sort** on `pokemon_name` and `pokemon_number` | Our own record of the console settings, not a Coveo import format |
| `fields-batch-create.json` | Detail-page fields | Request body for Coveo's batch field creation API |
| `full-source.json` | Settings of the full Pokémon source | Our own record of the console settings, not a Coveo import format |
| `extensions/reconstruct_body.py` | Pre-conversion extension that rewrites stat tables and type grids as sentences | Exact script pasted into the `pre-reconstruct-body` extension, which requests only **Original file** item data. Tests are in `test_reconstruct_body.py` |
| `query-pipeline.json` | The `pokebowl-search` query pipeline, its condition and filter rule | Our own record of the console settings, not a Coveo import format |
| `api-keys.json` | Settings of the browser search key, without its value | Our own record of the console settings, not a Coveo import format |
| `test-source.json` | Settings of the single-Pokémon test source | Our own record of the console settings, not a Coveo import format |

These files record the intended settings and do not prove what is live in Coveo. After applying a setting, confirm it in the console or through a query. The first full crawl ran without `performFieldMappingUsingAllOrigins` and without the Facet option on `pokemon_generation`, although both were recorded here.

The reasons behind these settings are recorded in [docs/architecture.md](../../docs/architecture.md).
