"""Tests that every form's facts are stated in sentences that name that form.

The fixtures copy the structure of pokemondb.net form tabs and the values of the real pages,
read on 2026-11-09. Only the attacking types that do not deal normal damage are listed.
"""
import re

import pytest
from bs4 import BeautifulSoup

from reconstruct_body import reconstruct

CHUNK_WORDS = 250  # Coveo RGA chunks hold up to 250 words: https://docs.coveo.com/en/nb6a0008/
# Unrelated text in each form tab, so that a chunk can start or end between two forms, as on real pages.
FILLER = " ".join(["filler"] * CHUNK_WORDS)


def ensure(condition: bool) -> None:
    if not condition:
        raise AssertionError


def form(label, types, height, weight, abilities, hidden, defenses, base_exp="100"):
    return {
        "label": label, "types": types, "height": height, "weight": weight,
        "abilities": abilities, "hidden": hidden, "defenses": defenses, "base_exp": base_exp,
    }


CHARIZARD_FX = {"Fire": 50, "Water": 200, "Electric": 200, "Grass": 25, "Fighting": 50, "Ground": 0,
                "Bug": 25, "Rock": 400, "Steel": 50, "Fairy": 50}
NORMAL_FX = {"Fighting": 200, "Ghost": 0}
DEOXYS_FX = {"Fighting": 50, "Psychic": 50, "Bug": 200, "Ghost": 200, "Dark": 200}
PIKACHU_FX = {"Electric": 50, "Ground": 200, "Flying": 50, "Steel": 50}

PAGES = {
    "Charizard": [
        form("Charizard", ["Fire", "Flying"], "1.7 m (5′07″)", "90.5 kg (199.5 lbs)", ["Blaze"], "Solar Power", CHARIZARD_FX, "267"),
        form("Mega Charizard X", ["Fire", "Dragon"], "1.7 m (5′07″)", "110.5 kg (243.6 lbs)", ["Tough Claws"], None,
             {"Fire": 25, "Electric": 50, "Grass": 25, "Ground": 200, "Bug": 50, "Rock": 200, "Dragon": 200, "Steel": 50}, "285"),
        form("Mega Charizard Y", ["Fire", "Flying"], "1.7 m (5′07″)", "100.5 kg (221.6 lbs)", ["Drought"], None, CHARIZARD_FX, "285"),
    ],
    "Pikachu": [
        form("Pikachu", ["Electric"], "0.4 m (1′04″)", "6.0 kg (13.2 lbs)", ["Static"], "Lightning Rod",
             {"Static ability": PIKACHU_FX, "Lightning Rod ability": {**PIKACHU_FX, "Electric": 0}}),
        form("Partner Pikachu", ["Electric"], "0.4 m (1′04″)", "6.0 kg (13.2 lbs)", [], None, PIKACHU_FX),
    ],
    "Eevee": [
        form("Eevee", ["Normal"], "0.3 m (1′00″)", "6.5 kg (14.3 lbs)", ["Run Away", "Adaptability"], "Anticipation", NORMAL_FX),
        form("Partner Eevee", ["Normal"], "0.3 m (1′00″)", "6.5 kg (14.3 lbs)", [], None, NORMAL_FX),
    ],
    "Deoxys": [
        form(label, ["Psychic"], "1.7 m (5′07″)", "60.8 kg (134.0 lbs)", ["Pressure"], None, DEOXYS_FX)
        for label in ("Normal Forme", "Attack Forme", "Defense Forme", "Speed Forme")
    ],
    "Tauros": [
        form("Tauros", ["Normal"], "1.4 m (4′07″)", "88.4 kg (194.9 lbs)", ["Intimidate", "Anger Point"], "Sheer Force", NORMAL_FX),
        form("Combat Breed", ["Fighting"], "1.4 m (4′07″)", "115.0 kg (253.5 lbs)", ["Intimidate", "Anger Point"], "Cud Chew",
             {"Flying": 200, "Psychic": 200, "Bug": 50, "Rock": 50, "Dark": 50, "Fairy": 200}),
        form("Blaze Breed", ["Fighting", "Fire"], "1.4 m (4′07″)", "85.0 kg (187.4 lbs)", ["Intimidate", "Anger Point"], "Cud Chew",
             {"Fire": 50, "Water": 200, "Grass": 50, "Ice": 50, "Ground": 200, "Flying": 200, "Psychic": 200, "Bug": 25,
              "Dark": 50, "Steel": 50}),
        form("Aqua Breed", ["Fighting", "Water"], "1.4 m (4′07″)", "110.0 kg (242.5 lbs)", ["Intimidate", "Anger Point"], "Cud Chew",
             {"Fire": 50, "Water": 50, "Electric": 200, "Grass": 200, "Ice": 50, "Flying": 200, "Psychic": 200, "Bug": 50,
              "Rock": 50, "Dark": 50, "Steel": 50, "Fairy": 200}),
    ],
    "Rotom": [
        form("Rotom", ["Electric", "Ghost"], "0.3 m (1′00″)", "0.3 kg (0.7 lbs)", ["Levitate"], None,
             {"Normal": 0, "Electric": 50, "Fighting": 0, "Poison": 50, "Ground": 0, "Flying": 50, "Bug": 50, "Ghost": 200,
              "Dark": 200, "Steel": 50}),
        form("Heat Rotom", ["Electric", "Fire"], "0.3 m (1′00″)", "0.3 kg (0.7 lbs)", ["Levitate"], None,
             {"Fire": 50, "Water": 200, "Electric": 50, "Grass": 50, "Ice": 50, "Ground": 0, "Flying": 50, "Bug": 50,
              "Rock": 200, "Steel": 25, "Fairy": 50}),
    ],
    "Meowth": [
        form("Meowth", ["Normal"], "0.4 m (1′04″)", "4.2 kg (9.3 lbs)", ["Pickup", "Technician"], "Unnerve", NORMAL_FX),
        form("Alolan Meowth", ["Dark"], "0.4 m (1′04″)", "4.2 kg (9.3 lbs)", ["Pickup", "Technician"], "Rattled",
             {"Fighting": 200, "Psychic": 0, "Bug": 200, "Ghost": 50, "Dark": 50, "Fairy": 200}),
        form("Galarian Meowth", ["Steel"], "0.4 m (1′04″)", "7.5 kg (16.5 lbs)", ["Pickup", "Tough Claws"], "Unnerve",
             {"Normal": 50, "Fire": 200, "Grass": 50, "Ice": 50, "Fighting": 200, "Poison": 0, "Ground": 200, "Flying": 50,
              "Psychic": 50, "Bug": 50, "Rock": 50, "Dragon": 50, "Steel": 50, "Fairy": 50}),
    ],
    "Bulbasaur": [
        form("Bulbasaur", ["Grass", "Poison"], "0.7 m (2′04″)", "6.9 kg (15.2 lbs)", ["Overgrow"], "Chlorophyll",
             {"Fire": 200, "Water": 50, "Electric": 50, "Grass": 25, "Ice": 200, "Fighting": 50, "Flying": 200,
              "Psychic": 200, "Fairy": 50}),
    ],
}


def abilities_cell(abilities, hidden):
    if not abilities and not hidden:
        return "<td>—</td>"
    regular = "".join(
        f'<span class="text-muted">{position}. <a href="/ability/x" title="t">{name}</a></span><br/>'
        for position, name in enumerate(abilities, start=1)
    )
    extra = f'<small class="text-muted"><a href="/ability/y" title="t">{hidden}</a> (hidden ability)</small><br/>' if hidden else ""
    return f"<td>{regular}{extra}</td>"


def grid(fx):
    cells = "".join(
        f'<td title="{attacker} &#8594; Defender = x" class="type-fx-cell type-fx-{value}"></td>' for attacker, value in fx.items()
    )
    return f'<div class="resp-scroll"><table class="type-table"><tr>{cells}</tr></table></div>'


def defenses_html(defenses):
    if all(isinstance(value, int) for value in defenses.values()):
        return grid(defenses)
    tabs = "".join(f'<a class="sv-tabs-tab" href="#fx-{n}">{label}</a>' for n, label in enumerate(defenses))
    panels = "".join(f'<div class="sv-tabs-panel" id="fx-{n}">{grid(fx)}</div>' for n, fx in enumerate(defenses.values()))
    return (
        '<div class="tabset-typedefcol sv-tabs-wrapper">'
        f'<div class="sv-tabs-tab-list">{tabs}</div><div class="sv-tabs-panel-list">{panels}</div></div>'
    )


def form_panel(panel_id, item):
    types = " ".join(f'<a class="type-icon" href="/type/x">{name}</a>' for name in item["types"])
    return f"""
    <div class="sv-tabs-panel" id="{panel_id}">
      <p>{FILLER}</p>
      <div class="grid-row"><div class="grid-col">
        <h2>Pokédex data</h2>
        <table class="vitals-table"><tbody>
          <tr><th>National №</th><td><strong>0001</strong></td></tr>
          <tr><th>Type</th><td>{types}</td></tr>
          <tr><th>Species</th><td>Test Pokémon</td></tr>
          <tr><th>Height</th><td>{item["height"]}</td></tr>
          <tr><th>Weight</th><td>{item["weight"]}</td></tr>
          <tr><th>Abilities</th>{abilities_cell(item["abilities"], item["hidden"])}</tr>
          <tr><th>Local №</th><td>0006 <small class="text-muted">(Red/Blue/Yellow)</small><br/>0231 <small class="text-muted">(Gold/Silver/Crystal)</small><br/></td></tr>
        </tbody></table>
      </div><div class="grid-col">
        <h2>Training</h2>
        <table class="vitals-table"><tbody><tr><th>Base Exp.</th><td>{item["base_exp"]}</td></tr></tbody></table>
        <h2>Breeding</h2>
        <table class="vitals-table"><tbody><tr><th>Egg Groups</th><td><a href="/egg-group/a">Dragon</a>, <a href="/egg-group/b">Monster</a></td></tr></tbody></table>
      </div></div>
      <div class="grid-row"><div class="grid-col">
        <h2>Base stats</h2>
        <div class="resp-scroll"><table class="vitals-table"><tbody>
          <tr><th>HP</th><td class="cell-num">78</td><td class="cell-barchart"></td><td class="cell-num">266</td><td class="cell-num">360</td></tr>
        </tbody><tfoot><tr><th>Total</th><td class="cell-num cell-total">534</td></tr></tfoot></table></div>
      </div><div class="grid-col">
        <h2>Type defenses</h2>
        <p>The effectiveness of each type on it.</p>
        {defenses_html(item["defenses"])}
      </div></div>
    </div>
    """


def page_html(name):
    forms = PAGES[name]
    tabs = "".join(f'<a class="sv-tabs-tab" href="#tab-{n}">{item["label"]}</a>' for n, item in enumerate(forms))
    panels = "".join(form_panel(f"tab-{n}", item) for n, item in enumerate(forms))
    return f"""
    <html><body><main id="main">
      <h1>{name}</h1>
      <p><em>{name}</em> is a Pokémon introduced in <abbr>Generation 1</abbr>.</p>
      <div class="tabset-basics sv-tabs-wrapper">
        <div class="sv-tabs-tab-list">{tabs}</div>
        <div class="sv-tabs-panel-list">{panels}</div>
      </div>
      <h2>Evolution chart</h2><div class="infocard-list-evo">Charmander Charmeleon</div>
      <h2>Pokédex entries</h2><table class="vitals-table"><tr><th>Red</th><td>Entry text.</td></tr></table>
    </main></body></html>
    """


def text_of(html):
    return " ".join(BeautifulSoup(html, "html.parser").get_text(" ").split())


def full_name(name, label):
    return label if name in label else f"{name} {label}"


def output(name):
    return text_of(reconstruct(page_html(name)))


FORMS = [(name, item) for name in PAGES for item in PAGES[name]]


@pytest.mark.parametrize(("name", "item"), FORMS, ids=[f"{n}-{i['label']}" for n, i in FORMS])
def test_every_form_fact_is_a_sentence_that_starts_with_the_form_name(name, item):
    text = output(name)
    subject = full_name(name, item["label"])
    types = " and ".join(item["types"])
    ensure(f"{subject} weighs {item['weight']}." in text)
    ensure(f"{subject} is {item['height']} tall." in text)
    ensure(f"{subject} is {types} type." in text)
    ensure(f"{subject} Base Exp.: {item['base_exp']}." in text)


def test_abilities_name_the_form_and_mark_the_hidden_ability():
    text = output("Charizard")
    ensure("Charizard abilities: Blaze, Solar Power (hidden ability)." in text)
    ensure("Mega Charizard X abilities: Tough Claws." in text)
    ensure("Tauros Combat Breed abilities: Intimidate, Anger Point, Cud Chew (hidden ability)." in output("Tauros"))


def test_a_form_without_abilities_says_so():
    ensure("Partner Eevee has no listed abilities." in output("Eevee"))


def test_unknown_values_are_stated_plainly():
    html = page_html("Eevee").replace("6.5 kg (14.3 lbs)", "—")
    ensure("Eevee has no listed weight." in text_of(reconstruct(html)))


def test_other_data_rows_are_named_and_local_numbers_stay_with_the_base_form():
    text = output("Charizard")
    ensure("Charizard is number 0001 in the National Pokédex." in text)
    ensure("Mega Charizard X is the Test Pokémon." in text)
    ensure("Charizard Local №: 0006 (Red/Blue/Yellow); 0231 (Gold/Silver/Crystal)." in text)
    ensure(text.count("Local №") == 1)
    ensure("Mega Charizard Y Egg Groups: Dragon, Monster." in text)
    ensure("vitals-table" not in reconstruct(page_html("Charizard")).split("Evolution chart")[0])


def mentions(window, subject, others):
    """True when the window names the subject outside the longer names of other forms."""
    for other in others:
        if subject in other:
            window = window.replace(other, "")
    return subject in window


@pytest.mark.parametrize("name", list(PAGES))
def test_every_chunk_with_a_weight_names_its_form(name):
    """Each weight value, wherever a chunk starts or ends around it, sits in a chunk that names its form."""
    words = output(name).split()
    subjects = [full_name(name, item["label"]) for item in PAGES[name]]
    for item in PAGES[name]:
        subject = full_name(name, item["label"])
        others = [other for other in subjects if other != subject]
        weight = item["weight"].split()[0]

        def belongs(i, owner):
            lead = f"{owner} weighs".split()
            return words[i - len(lead):i] == lead

        positions = [
            i for i, word in enumerate(words)
            if word == weight and belongs(i, subject) and not any(belongs(i, other) for other in others if subject in other)
        ]
        ensure(len(positions) == 1)
        for start in range(max(positions[0] - CHUNK_WORDS + 1, 0), positions[0] + 1):
            ensure(mentions(" ".join(words[start:start + CHUNK_WORDS]), subject, others))


def tab_names(name):
    soup = BeautifulSoup(reconstruct(page_html(name)), "html.parser")
    return [tab.get_text(strip=True) for tab in soup.select_one(".tabset-basics .sv-tabs-tab-list").find_all("a")]


@pytest.mark.parametrize("name", ["Deoxys", "Tauros"])
def test_form_labels_always_include_the_pokemon_name(name):
    text = output(name)
    for item in PAGES[name]:
        label = item["label"]
        if name not in label:
            ensure(re.search(rf"(?<!{name} ){re.escape(label)}", text) is None)
    ensure("Deoxys Attack Forme base stats:" in output("Deoxys"))
    ensure("Deoxys Attack Forme takes 2x damage from Bug, Ghost and Dark." in output("Deoxys"))


def test_form_tabs_show_the_full_form_name():
    ensure(tab_names("Deoxys") == ["Deoxys Normal Forme", "Deoxys Attack Forme", "Deoxys Defense Forme", "Deoxys Speed Forme"])
    ensure(tab_names("Tauros") == ["Tauros", "Tauros Combat Breed", "Tauros Blaze Breed", "Tauros Aqua Breed"])


def test_labels_that_already_hold_the_name_are_unchanged():
    ensure(tab_names("Meowth") == ["Meowth", "Alolan Meowth", "Galarian Meowth"])
    ensure("Galarian Meowth weighs 7.5 kg (16.5 lbs)." in output("Meowth"))


@pytest.mark.parametrize(("name", "sentences"), [
    ("Charizard", ["Charizard is weak to Rock (4x), Water and Electric.",
                   "Charizard resists Fire, Fighting, Steel, Fairy, Grass (0.25x) and Bug (0.25x).",
                   "Charizard is immune to Ground.",
                   "Mega Charizard X is weak to Ground, Rock and Dragon.",
                   "Mega Charizard X resists Electric, Bug, Steel, Fire (0.25x) and Grass (0.25x)."]),
    ("Pikachu", ["With the Static ability, Pikachu is weak to Ground.",
                 "With the Lightning Rod ability, Pikachu is immune to Electric.",
                 "Partner Pikachu is weak to Ground.",
                 "Partner Pikachu resists Electric, Flying and Steel."]),
    ("Eevee", ["Eevee is weak to Fighting.", "Eevee is immune to Ghost.", "Partner Eevee is weak to Fighting."]),
    ("Deoxys", ["Deoxys Normal Forme is weak to Bug, Ghost and Dark.", "Deoxys Speed Forme resists Fighting and Psychic."]),
    ("Tauros", ["Tauros is weak to Fighting.", "Tauros is immune to Ghost.",
                "Tauros Combat Breed is weak to Flying, Psychic and Fairy.",
                "Tauros Blaze Breed is weak to Water, Ground, Flying and Psychic."]),
    ("Rotom", ["Rotom is weak to Ghost and Dark.", "Rotom is immune to Normal, Fighting and Ground.",
               "Heat Rotom is weak to Water and Rock.", "Heat Rotom is immune to Ground."]),
    ("Meowth", ["Meowth is weak to Fighting.", "Alolan Meowth is weak to Fighting, Bug and Fairy.",
                "Alolan Meowth is immune to Psychic.", "Galarian Meowth is weak to Fire, Fighting and Ground.",
                "Galarian Meowth is immune to Poison."]),
    ("Bulbasaur", ["Bulbasaur is weak to Fire, Ice, Flying and Psychic.",
                   "Bulbasaur resists Water, Electric, Fighting, Fairy and Grass (0.25x)."]),
])
def test_weakness_sentences_use_everyday_words(name, sentences):
    text = output(name)
    for sentence in sentences:
        ensure(sentence in text)


def test_a_form_with_no_resistances_gets_no_resistance_sentence():
    ensure("Eevee resists" not in output("Eevee"))


def test_a_form_with_no_weaknesses_says_so():
    html = page_html("Bulbasaur")
    for attacker in ("Fire", "Ice", "Flying", "Psychic"):
        html = html.replace(f'title="{attacker} &#8594; Defender = x" class="type-fx-cell type-fx-200"',
                            f'title="{attacker} &#8594; Defender = x" class="type-fx-cell type-fx-100"')
    ensure("Bulbasaur has no type weaknesses." in text_of(reconstruct(html)))


def test_pokedex_entries_are_left_as_they_are():
    html = reconstruct(page_html("Charizard"))
    after = html.split("<h2>Evolution chart</h2>")[1]
    ensure('<table class="vitals-table"><tr><th>Red</th><td>Entry text.</td></tr></table>' in after)
