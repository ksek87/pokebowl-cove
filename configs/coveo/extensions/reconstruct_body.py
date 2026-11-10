"""Coveo pre-conversion extension that makes Pokémon page tables readable.

Data tables, type effectiveness grids and stat tables lose their meaning when
flattened to text, so they are rewritten as sentences before Coveo creates the
item body. Every sentence names its form, because a generated answer reads the
body in chunks and a chunk can start in the middle of a form's section.
"""

import re

from bs4 import BeautifulSoup, Tag

DAMAGE_LABELS = ((400, "4x damage"), (200, "2x damage"), (50, "0.5x damage"), (25, "0.25x damage"), (0, "no damage"))
NORMAL_DAMAGE = 100
DOUBLE_DAMAGE = 200
HALF_DAMAGE = 50
NO_DAMAGE = 0
DATA_SENTENCES = {
    "National №": "{subject} is number {value} in the National Pokédex.",
    "Type": "{subject} is {value} type.",
    "Species": "{subject} is the {value}.",
    "Height": "{subject} is {value} tall.",
    "Weight": "{subject} weighs {value}.",
    "Abilities": "{subject} abilities: {value}.",
}
OTHER_DATA_SENTENCE = "{subject} {label}: {value}."
UNKNOWN_VALUES = ("", "—", "???")
HIDDEN_ABILITY = "hidden ability"
CLUTTER_SELECTORS = ("header", "footer", "nav", "ul.list-nav", 'a[href="#main"]')
REPEATED_TEXT = ("Additional artwork", "The ranges shown on the right")


def join_names(names):
    if len(names) == 1:
        return names[0]
    return f"{', '.join(names[:-1])} and {names[-1]}"


def cell_multiplier(cell):
    for css_class in cell.get("class", []):
        if css_class.startswith("type-fx-") and css_class[8:].isdigit():
            return int(css_class[8:])
    return NORMAL_DAMAGE


def attackers_by_multiplier(container):
    grouped = {}
    for cell in container.select("td[title]"):
        attacker = cell["title"].split(" → ")[0]
        grouped.setdefault(cell_multiplier(cell), []).append(attacker)
    return grouped


def marked(names, value, common):
    """Names the multiplier only where it differs from the common one, as in "Rock (4x)"."""
    if value == common:
        return names
    return [f"{name} ({value / NORMAL_DAMAGE:g}x)" for name in names]


def attackers_where(grouped, keep, common):
    """Attacking types whose multiplier passes `keep`, strongest first."""
    return [name for value in sorted(grouped, reverse=True) if keep(value) for name in marked(grouped[value], value, common)]


def weakness_sentences(subject, grouped):
    """States type matchups in the words people ask with: weak to, resists, immune to."""
    weak = attackers_where(grouped, lambda value: value > NORMAL_DAMAGE, DOUBLE_DAMAGE)
    resisted = attackers_where(grouped, lambda value: NO_DAMAGE < value < NORMAL_DAMAGE, HALF_DAMAGE)
    sentences = [f"{subject} is weak to {join_names(weak)}." if weak else f"{subject} has no type weaknesses."]
    if resisted:
        sentences.append(f"{subject} resists {join_names(resisted)}.")
    if NO_DAMAGE in grouped:
        sentences.append(f"{subject} is immune to {join_names(grouped[NO_DAMAGE])}.")
    return " ".join(sentences)


def defense_sentences(subject, container):
    grouped = attackers_by_multiplier(container)
    clauses = [f"takes {label} from {join_names(grouped[value])}." for value, label in DAMAGE_LABELS if value in grouped]
    if not clauses:
        return f"{subject} takes normal damage from every type."
    return " ".join([f"{subject} {clauses[0]}"] + [f"It {clause}" for clause in clauses[1:]])


def paragraph(soup, text):
    tag = soup.new_tag("p")
    tag.string = text
    return tag


def tab_labels(wrapper):
    return {tab["href"].lstrip("#"): tab.get_text(strip=True) for tab in wrapper.select(".sv-tabs-tab-list a[href]")}


def defense_groups(name, container):
    if "tabset-typedefcol" not in container.get("class", []):
        return [(name, container)]
    labels = tab_labels(container)
    return [
        (f"With the {labels[item['id']].replace(' ability', '')} ability, {name}", item)
        for item in container.select(".sv-tabs-panel-list > .sv-tabs-panel")
    ]


def rewrite_defenses(soup, panel, name):
    heading = panel.find("h2", string="Type defenses")
    if heading is None:
        return
    intro = heading.find_next_sibling("p")
    if intro is not None:
        intro.decompose()
    container = heading.find_next_sibling("div")
    for subject, group in defense_groups(name, container):
        container.insert_before(paragraph(soup, weakness_sentences(subject, attackers_by_multiplier(group))))
        container.insert_before(paragraph(soup, defense_sentences(subject, group)))
    container.decompose()


def stat_sentence(row):
    values = [cell.get_text(strip=True) for cell in row.select("td.cell-num")]
    return f"{row.th.get_text(strip=True)}: base {values[0]}, ranging from {values[1]} to {values[2]} at level 100."


def rewrite_stats(soup, panel, name):
    heading = panel.find("h2", string="Base stats")
    container = heading.find_next_sibling() if heading else None
    table = container.select_one("table.vitals-table") if container else None
    if table is None:
        return
    lines = [stat_sentence(row) for row in table.select("tbody tr")]
    total = table.select_one("td.cell-total").get_text(strip=True)
    container.replace_with(paragraph(soup, f"{name} base stats: {' '.join(lines)} Total: {total}."))


def clean_text(cell):
    for line_break in cell.find_all("br"):
        line_break.replace_with("; ")
    text = " ".join(cell.get_text(" ", strip=True).split())
    return re.sub(r"\s+([,;)])", r"\1", re.sub(r"\(\s+", "(", text)).strip("; ")


def ability_names(cell):
    names = []
    for link in cell.find_all("a"):
        after = link.next_sibling
        hidden = isinstance(after, str) and HIDDEN_ABILITY in after
        names.append(f"{link.get_text(strip=True)} ({HIDDEN_ABILITY})" if hidden else link.get_text(strip=True))
    return ", ".join(names)


def data_value(label, cell):
    links = [link.get_text(strip=True) for link in cell.find_all("a")]
    if label == "Type" and links:
        return join_names(links)
    if label == "Abilities":
        return ability_names(cell) or clean_text(cell)
    return clean_text(cell)


def data_sentence(subject, row):
    label = row.th.get_text(" ", strip=True)
    value = data_value(label, row.td)
    if value in UNKNOWN_VALUES:
        return f"{subject} has no listed {label.lower()}."
    return DATA_SENTENCES.get(label, OTHER_DATA_SENTENCE).format(subject=subject, label=label, value=value)


def rewrite_data_tables(soup, panel, name):
    for heading in panel.find_all("h2"):
        table = heading.find_next_sibling()
        if table is not None and table.name == "table" and "vitals-table" in table.get("class", []):
            rows = [row for row in table.select("tr") if row.th and row.td]
            table.replace_with(paragraph(soup, " ".join(data_sentence(name, row) for row in rows)))


def remove_repeated_text(panel):
    for item in panel.find_all("p"):
        if any(text in item.get_text() for text in REPEATED_TEXT):
            item.decompose()


def remove_local_numbers(panel):
    for header in panel.find_all("th"):
        if "Local" in header.get_text():
            header.find_parent("tr").decompose()


def rewrite_panel(soup, panel, name):
    rewrite_stats(soup, panel, name)
    rewrite_data_tables(soup, panel, name)
    rewrite_defenses(soup, panel, name)
    remove_repeated_text(panel)


def form_name(pokemon, label):
    """Adds the Pokémon's name to labels such as "Attack Forme", and keeps labels such as "Mega Charizard X"."""
    if not pokemon or pokemon in label:
        return label
    return f"{pokemon} {label}"


def name_form_tabs(wrapper, pokemon):
    """Renames the form tabs and returns each panel's full form name."""
    names = {}
    for tab in wrapper.select_one(".sv-tabs-tab-list").select("a[href]"):
        names[tab["href"].lstrip("#")] = form_name(pokemon, tab.get_text(strip=True))
        tab.string = names[tab["href"].lstrip("#")]
    return names


def rewrite_form_panels(soup):
    wrapper = soup.select_one(".tabset-basics")
    if wrapper is None:
        return
    heading = soup.find("h1")
    names = name_form_tabs(wrapper, heading.get_text(strip=True) if heading else "")
    panels = wrapper.select_one(".sv-tabs-panel-list").find_all("div", class_="sv-tabs-panel", recursive=False)
    for index, panel in enumerate(panels):
        if index > 0:
            remove_local_numbers(panel)
        rewrite_panel(soup, panel, names[panel["id"]])


def remove_clutter(soup):
    """Coveo does not document whether this script receives the scraped page."""
    for selector in CLUTTER_SELECTORS:
        for item in soup.select(selector):
            item.decompose()
    moves = soup.find(id="dex-moves")
    if moves is not None:
        for item in moves.find_next_siblings():
            item.decompose()


def evolution_card_name(card):
    data = card.select_one(".infocard-lg-data")
    name = data.select_one("a.ent-name").get_text(strip=True)
    labels = [
        small.get_text(" ", strip=True) for small in data.find_all("small", recursive=False)
        if not small.find("a", class_="itype") and not small.get_text(strip=True).startswith("#")
    ]
    if not labels:
        return name
    return labels[0] if name in labels[0] else f"{name} ({labels[0]})"


def evolution_condition(arrow):
    small = arrow.find("small")
    text = small.get_text(" ", strip=True).strip("()") if small else ""
    return " ".join(text.replace(" ,", ",").split())


def is_plus(child):
    return child.name == "span" and not child.get("class") and child.get_text(strip=True) == "+"


def add_evolution_card(name, state, steps):
    if state["together"] and steps:
        before, after, how = steps[-1]
        steps[-1] = (before, f"{after} and {name}", how)
        state["together"] = False
    elif state["condition"] is not None:
        steps.append((state["last"], name, state["condition"]))
        state["condition"] = None
    state["last"] = name


def read_evolution_child(child, state, steps):
    classes = child.get("class", [])
    if is_plus(child):
        state["together"] = True
    elif "infocard-arrow" in classes:
        state["condition"] = evolution_condition(child)
    elif "infocard-evo-split" in classes:
        for branch in child.find_all("div", class_="infocard-list-evo", recursive=False):
            evolution_steps(branch, state["last"], steps)
    elif "infocard" in classes:
        add_evolution_card(evolution_card_name(child), state, steps)


def evolution_steps(chart_row, previous, steps):
    """Read a chart row left to right. A branch row starts with an arrow from the card before its split."""
    state = {"last": previous, "condition": None, "together": False}
    for child in chart_row.children:
        if isinstance(child, Tag):
            read_evolution_child(child, state, steps)
    return steps


def evolution_sentence(before, after, condition):
    return f"{before} evolves into {after} ({condition})." if condition else f"{before} evolves into {after}."


def chart_rows(soup):
    return [chart_row for chart_row in soup.select(".infocard-list-evo")
            if chart_row.find_parent(class_="infocard-evo-split") is None]


def chart_sentences(rows):
    steps = []
    for chart_row in rows:
        evolution_steps(chart_row, None, steps)
    return list(dict.fromkeys(evolution_sentence(*step) for step in steps if step[0] is not None))


def rewrite_evolution_chart(soup):
    """Replace the flattened chart with one sentence per evolution step. Pages without a chart keep their text."""
    rows = chart_rows(soup)
    sentences = chart_sentences(rows)
    if not sentences:
        return
    for sentence in sentences:
        rows[0].insert_before(paragraph(soup, sentence))
    for chart_row in rows:
        chart_row.decompose()


def reconstruct(html):
    soup = BeautifulSoup(html, "html.parser")
    remove_clutter(soup)
    rewrite_form_panels(soup)
    rewrite_evolution_chart(soup)
    return str(soup)


def run(item):
    html = item.get_data_stream("documentdata").read().decode("utf-8")
    stream = item.DataStream("documentdata")
    stream.write(reconstruct(html))
    item.add_data_stream(stream)


if "document" in globals():
    run(document)  # noqa: F821 - Coveo provides this object at runtime.
