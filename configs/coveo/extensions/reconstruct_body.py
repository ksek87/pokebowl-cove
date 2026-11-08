"""Coveo pre-conversion extension that makes Pokémon page tables readable.

Type effectiveness grids and stat tables lose their meaning when flattened to
text, so they are rewritten as sentences before Coveo creates the item body.
"""

from bs4 import BeautifulSoup

DAMAGE_LABELS = ((400, "4x damage"), (200, "2x damage"), (50, "0.5x damage"), (25, "0.25x damage"), (0, "no damage"))
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
    return 100


def attackers_by_multiplier(container):
    grouped = {}
    for cell in container.select("td[title]"):
        attacker = cell["title"].split(" → ")[0]
        grouped.setdefault(cell_multiplier(cell), []).append(attacker)
    return grouped


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
    rewrite_defenses(soup, panel, name)
    remove_repeated_text(panel)


def rewrite_form_panels(soup):
    wrapper = soup.select_one(".tabset-basics")
    if wrapper is None:
        return
    labels = tab_labels(wrapper)
    panels = wrapper.select_one(".sv-tabs-panel-list").find_all("div", class_="sv-tabs-panel", recursive=False)
    for index, panel in enumerate(panels):
        rewrite_panel(soup, panel, labels[panel["id"]])
        if index > 0:
            remove_local_numbers(panel)


def remove_clutter(soup):
    """Coveo does not document whether this script receives the scraped page."""
    for selector in CLUTTER_SELECTORS:
        for item in soup.select(selector):
            item.decompose()
    moves = soup.find(id="dex-moves")
    if moves is not None:
        for item in moves.find_next_siblings():
            item.decompose()


def reconstruct(html):
    soup = BeautifulSoup(html, "html.parser")
    remove_clutter(soup)
    rewrite_form_panels(soup)
    return str(soup)


def run(item):
    html = item.get_data_stream("documentdata").read().decode("utf-8")
    stream = item.DataStream("documentdata")
    stream.write(reconstruct(html))
    item.add_data_stream(stream)


if "document" in globals():
    run(document)  # noqa: F821 - Coveo provides this object at runtime.
