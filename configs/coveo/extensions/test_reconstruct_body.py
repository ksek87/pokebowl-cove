import io

from bs4 import BeautifulSoup

from reconstruct_body import reconstruct, run


def ensure(condition: bool) -> None:
    if not condition:
        raise AssertionError


def stats_block() -> str:
    return """
    <h2>Base stats</h2>
    <div class="resp-scroll"><table class="vitals-table">
      <tbody>
        <tr><th>HP</th><td class="cell-num">78</td><td class="cell-barchart"></td>
            <td class="cell-num">266</td><td class="cell-num">360</td></tr>
      </tbody>
      <tfoot><tr><th>Total</th><td class="cell-num cell-total">534</td>
          <th class="cell-barchart"></th><th>Min</th><th>Max</th></tr></tfoot>
    </table></div>
    <p class="text-small text-muted">The ranges shown on the right are for a level 100.</p>
    """


def grid() -> str:
    return """
    <table class="type-table"><tr>
      <td title="Normal &#8594; Fire = normal effectiveness" class="type-fx-cell type-fx-100"></td>
      <td title="Rock &#8594; Fire = super-effective" class="type-fx-cell type-fx-400">4</td>
      <td title="Water &#8594; Fire = super-effective" class="type-fx-cell type-fx-200">2</td>
      <td title="Fighting &#8594; Fire = not very effective" class="type-fx-cell type-fx-25">¼</td>
      <td title="Ground &#8594; Fire = no effect" class="type-fx-cell type-fx-0">0</td>
    </tr></table>
    """


def panel(panel_id: str, defenses: str, stats: str = "") -> str:
    return f"""
    <div class="sv-tabs-panel" id="{panel_id}">
      <p class="text-small"><a href="/artwork/x">Additional artwork</a></p>
      <table><tr><th>Local №</th><td>0231 (Gold)</td></tr></table>
      {stats or stats_block()}
      <h2>Type defenses</h2>
      <p>The effectiveness of each type on it.</p>
      {defenses}
    </div>
    """


def page(*panels: str, tabs: str, heading: str = "Charizard") -> str:
    return f"""
    <html><body>
      <header>Site header</header><a href="#main">Skip to main content</a>
      <main id="main">
        <nav>Prev next</nav><ul class="list-nav"><li>Contents</li></ul>
        <h1>{heading}</h1>
        <div class="tabset-basics sv-tabs-wrapper">
          <div class="sv-tabs-tab-list">{tabs}</div>
          <div class="sv-tabs-panel-list">{"".join(panels)}</div>
        </div>
        <div id="dex-moves"></div><h2>Moves learned</h2><div>Flamethrower</div>
      </main>
      <footer>Site footer</footer>
    </body></html>
    """


TWO_FORMS = page(
    panel("base", f'<div class="resp-scroll">{grid()}</div>'),
    panel("mega", f'<div class="resp-scroll">{grid()}</div>'),
    tabs='<a href="#base">Charizard</a><a href="#mega">Mega Charizard X</a>',
)


def text_of(html: str) -> str:
    return " ".join(BeautifulSoup(html, "html.parser").get_text(" ").split())


def test_defenses_become_sentences_grouped_by_damage():
    text = text_of(reconstruct(TWO_FORMS))
    ensure((
        "Charizard takes 4x damage from Rock. It takes 2x damage from Water. "
        "It takes 0.25x damage from Fighting. It takes no damage from Ground."
    ) in text)


def test_each_form_is_named_in_its_own_sentences():
    text = text_of(reconstruct(TWO_FORMS))
    ensure("Mega Charizard X takes 4x damage from Rock." in text)
    ensure("Mega Charizard X base stats:" in text)


def test_grid_and_its_intro_are_removed():
    output = reconstruct(TWO_FORMS)
    ensure("type-table" not in output)
    ensure("The effectiveness of each type" not in output)


def test_stats_are_labelled_with_ranges_and_total():
    text = text_of(reconstruct(TWO_FORMS))
    ensure((
        "Charizard base stats: HP: base 78, ranging from 266 to 360 at level 100. Total: 534."
    ) in text)
    ensure("Min" not in text.split())


def test_boilerplate_is_removed():
    text = text_of(reconstruct(TWO_FORMS))
    ensure("Additional artwork" not in text)
    ensure("The ranges shown" not in text)


def test_local_numbers_are_kept_only_for_the_base_form():
    ensure(text_of(reconstruct(TWO_FORMS)).count("Local №") == 1)


def test_page_clutter_and_moves_are_removed_if_still_present():
    text = text_of(reconstruct(TWO_FORMS))
    for removed in ("Site header", "Skip to main", "Prev next", "Contents", "Flamethrower", "Site footer"):
        ensure(removed not in text)


def test_ability_specific_defenses_name_the_ability():
    ability_grids = f"""
    <div class="tabset-typedefcol sv-tabs-wrapper">
      <div class="sv-tabs-tab-list"><a href="#one">Soundproof ability</a><a href="#two">Filter ability</a></div>
      <div class="sv-tabs-panel-list">
        <div class="sv-tabs-panel" id="one"><div class="resp-scroll">{grid()}</div></div>
        <div class="sv-tabs-panel" id="two"><div class="resp-scroll">{grid()}</div></div>
      </div>
    </div>
    """
    html = page(panel("base", ability_grids), tabs='<a href="#base">Mr. Mime</a>', heading="Mr. Mime")
    text = text_of(reconstruct(html))
    ensure("With the Soundproof ability, Mr. Mime takes 4x damage from Rock." in text)
    ensure("With the Filter ability, Mr. Mime takes 4x damage from Rock." in text)


def test_unknown_stats_are_left_as_written():
    unknown = "<h2>Base stats</h2><ul><li>The base stats are not currently known.</li></ul>"
    html = page(panel("base", f'<div class="resp-scroll">{grid()}</div>', unknown), tabs='<a href="#base">Browt</a>')
    ensure("The base stats are not currently known." in text_of(reconstruct(html)))


def test_only_normal_damage_is_stated_plainly():
    normal = '<div class="resp-scroll"><table class="type-table"><tr><td title="Fire &#8594; Rock = normal effectiveness" class="type-fx-cell type-fx-100"></td></tr></table></div>'
    html = page(panel("base", normal), tabs='<a href="#base">Testmon</a>')
    ensure("Testmon takes normal damage from every type." in text_of(reconstruct(html)))


class FakeStream(io.BytesIO):
    def __init__(self, name: str):
        super().__init__()
        self.name = name

    def write(self, value):
        return super().write(value.encode("utf-8"))


class FakeDocument:
    DataStream = FakeStream

    def __init__(self, html: str):
        self.html = html
        self.saved = None

    def get_data_stream(self, name: str):
        ensure(name == "documentdata")
        return io.BytesIO(self.html.encode("utf-8"))

    def add_data_stream(self, stream):
        self.saved = stream


def test_run_writes_reconstructed_html_back_to_documentdata():
    document = FakeDocument(TWO_FORMS)
    run(document)
    ensure(document.saved.name == "documentdata")
    ensure("takes 4x damage" in document.saved.getvalue().decode("utf-8"))
