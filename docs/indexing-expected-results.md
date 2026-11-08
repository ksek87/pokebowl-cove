# Indexing Expected Results

These are the values each indexed Pokémon must have. They were read from the pages on pokemondb.net and cover pages that are likely to expose extraction problems.

| Pokémon | Why it is included | Type | Generation | Number | Abilities |
|---|---|---|---|---|---|
| Charizard | Mega forms have different Types | Fire, Flying | Generation 1 | 0006 | Blaze, Solar Power |
| Mr. Mime | Name contains punctuation | Psychic, Fairy | Generation 1 | 0122 | Soundproof, Filter, Technician |
| Porygon2 | Name contains a digit | Normal | Generation 2 | 0233 | Trace, Download, Analytic |
| Rotom | Has alternate forms | Electric, Ghost | Generation 4 | 0479 | Levitate |
| Browt | New Pokémon with incomplete data | Grass | Generation 10 | ??? | Overgrow |

Each image is expected at `https://img.pokemondb.net/artwork/<url-name>.jpg`, for example `charizard.jpg`.

Browt has no base stats yet, so its stat fields are expected to be empty.

## Full crawl

The full source must contain exactly 1,028 items: 1,025 numbered Pokémon and the Generation 10 Pokémon `browt`, `gecqua` and `pombon`. These must not be indexed:

- Pages that are not directly under `/pokedex/`, such as moves, types and game pages
- `/pokedex/{name}/moves/{generation}` pages
- The list pages `/pokedex/all`, `/pokedex/national` and `/pokedex/shiny`
