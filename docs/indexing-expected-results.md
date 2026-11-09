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

## Body text

Tables must be rewritten as readable sentences. For Charizard, the body must include:

- `Charizard base stats: HP: base 78, ranging from 266 to 360 at level 100.`
- `Charizard takes 4x damage from Rock.`
- `Mega Charizard X takes 2x damage from Ground, Rock and Dragon.`

Every fact in a form tab must be a sentence that starts with that form's full name. For Charizard, the body must also include:

- `Charizard weighs 90.5 kg (199.5 lbs).`
- `Mega Charizard X weighs 110.5 kg (243.6 lbs).`
- `Charizard is Fire and Flying type.`
- `Mega Charizard X is Fire and Dragon type.`
- `Charizard abilities: Blaze, Solar Power (hidden ability).`
- `Charizard is weak to Rock (4x), Water and Electric.`
- `Charizard is immune to Ground.`

Form labels in the form tabs must include the Pokémon's name. For Deoxys, the body must include `Deoxys Attack Forme base stats:`, and the form tabs must not include "Attack Forme" without "Deoxys" before it. The page introduction, evolution chart and Pokédex entries keep the site's labels.

The body must not include site navigation, type effectiveness grids, unlabelled stat ranges or the Moves section and anything after it.

## Full crawl

The full source must contain exactly 1,028 items: 1,025 numbered Pokémon and the Generation 10 Pokémon `browt`, `gecqua` and `pombon`. These must not be indexed:

- Pages that are not directly under `/pokedex/`, such as moves, types and game pages
- `/pokedex/{name}/moves/{generation}` pages
- The list pages `/pokedex/all`, `/pokedex/national` and `/pokedex/shiny`
