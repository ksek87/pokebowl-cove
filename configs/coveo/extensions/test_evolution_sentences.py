"""Tests that the evolution chart is rewritten as sentences that say who evolves into whom.

The fixtures copy the structure of pokemondb.net evolution charts, read on 2026-11-10: a row
(`infocard-list-evo`) runs card, arrow, card; a split (`infocard-evo-split`) holds branch rows that
start with an arrow; a `+` span joins two cards that appear together (Nincada).
"""
from bs4 import BeautifulSoup

from reconstruct_body import reconstruct


def ensure(condition: bool) -> None:
    if not condition:
        raise AssertionError


def card(name, number, label=None):
    form = f"<small>{label}</small><br/>" if label else ""
    return (
        f'<div class="infocard"><span class="infocard-lg-img"><a href="/pokedex/{name.lower()}"></a></span>'
        f'<span class="infocard-lg-data text-muted"><small>#{number}</small><br/> '
        f'<a class="ent-name" href="/pokedex/{name.lower()}">{name}</a><br/> {form}'
        f'<small><a class="itype normal" href="/type/normal">Normal</a></small></span></div> '
    )


def arrow(condition):
    return f'<span class="infocard infocard-arrow"><i class="icon-arrow icon-arrow-e"></i><small>({condition})</small></span>'


def row(*parts):
    return '<div class="infocard-list-evo">' + "".join(parts) + "</div>"


def split(*branches):
    return '<span class="infocard-evo-split">' + "".join(branches) + "</span>"


PLUS = '<span><i class="icon-arrow">+</i></span>'


def page(name, chart):
    return (
        f"<html><body><main><h1>{name}</h1><p>{name} is a Pokémon.</p>"
        f"<h2>Evolution chart</h2>{chart}"
        f"<h2>{name} changes</h2><p>No changes.</p></main></body></html>"
    )


def evolution_text(html):
    soup = BeautifulSoup(reconstruct(html), "html.parser")
    heading = next(h for h in soup.find_all("h2") if h.get_text(strip=True) == "Evolution chart")
    parts = []
    for sibling in heading.find_next_siblings():
        if sibling.name == "h2":
            break
        parts.append(sibling.get_text(" ", strip=True))
    return " ".join(parts)


def test_linear_chain():
    chart = row(card("Charmander", "0004"), arrow("Level 16"), card("Charmeleon", "0005"),
                arrow("Level 36"), card("Charizard", "0006"))
    text = evolution_text(page("Charizard", chart))
    ensure("Charmander evolves into Charmeleon (Level 16)." in text)
    ensure("Charmeleon evolves into Charizard (Level 36)." in text)


def test_branch_uses_the_card_before_the_split_and_the_form_label():
    chart = row(card("Pichu", "0172"), arrow("high Friendship"), card("Pikachu", "0025"),
                split(row(arrow("use Thunder Stone, outside Alola"), card("Raichu", "0026")),
                      row(arrow("use Thunder Stone, in Alola"), card("Raichu", "0026", "Alolan Raichu"))))
    text = evolution_text(page("Pikachu", chart))
    ensure("Pichu evolves into Pikachu (high Friendship)." in text)
    ensure("Pikachu evolves into Raichu (use Thunder Stone, outside Alola)." in text)
    ensure("Pikachu evolves into Alolan Raichu (use Thunder Stone, in Alola)." in text)


def test_separate_rows_are_separate_chains():
    chart = (row(card("Eevee", "0133"), split(row(arrow("use Water Stone"), card("Vaporeon", "0134")),
                                              row(arrow("use Thunder Stone"), card("Jolteon", "0135"))))
             + row(card("Eevee", "0133"), arrow("high Friendship, Daytime"), card("Espeon", "0196")))
    text = evolution_text(page("Eevee", chart))
    ensure("Eevee evolves into Vaporeon (use Water Stone)." in text)
    ensure("Eevee evolves into Jolteon (use Thunder Stone)." in text)
    ensure("Eevee evolves into Espeon (high Friendship, Daytime)." in text)


def test_steps_after_a_branch_follow_the_branch():
    chart = row(card("Wurmple", "0265"),
                split(row(arrow("Level 7"), card("Silcoon", "0266"), arrow("Level 10"), card("Beautifly", "0267")),
                      row(arrow("Level 7"), card("Cascoon", "0268"), arrow("Level 10"), card("Dustox", "0269"))))
    text = evolution_text(page("Wurmple", chart))
    ensure("Silcoon evolves into Beautifly (Level 10)." in text)
    ensure("Cascoon evolves into Dustox (Level 10)." in text)
    ensure("Wurmple evolves into Cascoon (Level 7)." in text)


def test_cards_joined_by_plus_appear_together():
    chart = row(card("Nincada", "0290"),
                split(row(arrow("Level 20"), card("Ninjask", "0291")),
                      row(arrow("Level 20, empty spot in party"), card("Ninjask", "0291"), PLUS, card("Shedinja", "0292"))))
    text = evolution_text(page("Nincada", chart))
    ensure("Nincada evolves into Ninjask (Level 20)." in text)
    ensure("Nincada evolves into Ninjask and Shedinja (Level 20, empty spot in party)." in text)


def test_the_flattened_chart_is_replaced():
    chart = row(card("Charmander", "0004"), arrow("Level 16"), card("Charmeleon", "0005"))
    html = reconstruct(page("Charmeleon", chart))
    ensure("infocard-list-evo" not in html)
    ensure("#0004" not in html)


def test_a_page_without_a_chart_is_unchanged():
    html = page("Ditto", "<p>Ditto does not evolve.</p>")
    ensure(evolution_text(html) == "Ditto does not evolve.")
