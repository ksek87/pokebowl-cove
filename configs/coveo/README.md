# Coveo configuration

Copies of the configuration applied in the Coveo Administration Console. The console is where changes are made, so update these files whenever a setting changes. These files must never contain API keys or other secrets.

| File | Contents | Format |
|---|---|---|
| `web-scraping.json` | Page exclusions and metadata selectors | Exact JSON pasted into the source's web scraping configuration |
| `test-source.json` | Settings of the single-Pokémon test source | Our own record of the console settings, not a Coveo import format |

The reasons behind these settings are recorded in [docs/architecture.md](../../docs/architecture.md).
