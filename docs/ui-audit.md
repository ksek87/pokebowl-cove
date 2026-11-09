# Interface audit

This report reviews the interface of the Pokémon search application, built with React, Vite, Coveo Atomic and Headless, Tailwind and shadcn/ui. It judges what a person sees and can do at desktop widths of 1100, 1440, 1920 and 2560 px. Phone layouts are out of scope by the owner's decision.

Two builds were reviewed: the search page on branch `fix/code-review-findings`, and the Pokémon detail page on branch `feature/detail-page`. All evidence comes from a real Chromium browser, using screenshots, bounding boxes and computed styles. Unless a finding says otherwise, images from pokemondb.net were replaced by a neutral gray circle of the same dimensions, so a gray circle in a screenshot is not a defect. Real artwork was checked on two page loads.

## Verdict

The normal results view is good: with real artwork it is coherent, friendly and tidy, and the grid is accurate at every width. The product stops looking finished as soon as anything departs from the normal path. Error and no-results states show default Atomic artwork and generic text that belong to a different product, loading does not resemble the final page, and keyboard focus is close to invisible on selected controls. The status row jumps vertically depending on the state, and the page has several competing center lines. A Coveo expert will recognize the unstyled Atomic defaults at once.

**Top issues**

1. The error state shows an internal service URL, says "No access", and offers no retry (UI-01).
2. The no-results state is a 649 px default illustration with no way forward (UI-02).
3. Focus indicators measure 1.69:1 and use three different styles (UI-03).
4. Sort and page-size controls move vertically by up to 105 px between states (UI-04).
5. The page uses different center lines and edges for the header, search box and results (UI-05).

**What is good**

- Cards are equal in size and aligned at every width, and no width scrolls horizontally.
- Type-tinted artwork works well with real images, and type badges are legible.
- URL state is reliable: reload kept the query and page, Back stepped through searches, and "Back to search" restored the query, filter and sort from the detail page.
- After paging, focus moves to the first new result and the page scrolls back to the results.
- With reduced motion requested, no animations were running during loading and card transitions were off.
- Search results are announced in a live region ("Results loaded. Results 1-12 of 82 for fire"), `lang` is set, and landmarks exist.
- The detail page centers correctly at all widths and handles a Pokémon with no stats and no number cleanly.

## Findings

### High

#### UI-01: The error state exposes an internal URL and offers no recovery

- **Where:** search page, all widths, when the search request fails. Tested by aborting the request at 1100 and 1440 px.
- **What is wrong:** the heading says "No access." although the real condition was a network failure. The text prints the organization endpoint in full: "Your query couldn't be sent to the following URL: https://…org.coveo.com. Verify your connection." The only button is "Learn more", which is Atomic's link to documentation meant for developers. There is no retry, and the illustration is a purple and red robot unrelated to the application's palette.
- **Evidence:** the error block is 760 px tall (top 255, bottom 1015 at 1440 px). The facets, sort and page-size controls all disappear. Atomic's `atomic-query-error` documents the parts `icon`, `title`, `description`, `doc-link`, `more-info-btn` and `error-info`, and none of them are styled in `src/theme.css`.
- **Why it matters:** it is alarming and misleading for a visitor, shows a technical identifier in the interface, and leaves reload as the only way out.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/error-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/error-1100.png`
- **Direction:** show a short message in the application's voice and a retry action that re-runs the search. Hide the technical details. Either restyle through the documented parts or replace the view using Headless search status.
- **Owner decision:** wording and whether any technical detail stays visible.

#### UI-02: The no-results state is an oversized default with no way forward

- **Where:** search page, all widths. Tested with `/#q=9999`.
- **What is wrong:** the state is dominated by Atomic's default purple magnifying glass on a gray diamond. The text is generic: "You may want to try using different keywords, deselecting filters, or checking for spelling mistakes." This is wrong for a number lookup, where no spelling is involved and no filter is active. The facets vanish, and there is no action or link such as showing all Pokémon or a sample query.
- **Evidence:** at 1440 px the block is 649 px tall, which is 72% of a 900 px window. The message starts at about 830 px, close to the bottom of the window. The documented parts of `atomic-no-results` (`icon`, `no-results`, `highlight`, `search-tips`, `cancel-button`) are unused.
- **Why it matters:** an empty result is a normal search outcome, and this is where the interface looks least like a designed product.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/nores-1440.png`
- **Direction:** replace or remove the illustration, keep the message near the search box, and offer a clear next step. Give number-only searches a specific message that says the Pokédex number does not exist.
- **Owner decision:** which recovery actions to offer.

#### UI-03: Focus indicators are too faint and inconsistent

- **Where:** search page and detail page, all widths, keyboard use.
- **What is wrong:** most controls use a 2 px ring in `rgba(209, 53, 43, 0.35)`. On selected controls, such as the active page size and active page number, that faint ring beside a solid red button is the only sign of focus and is barely visible. The clear button and facet checkboxes instead use the browser's blue outline. Result links have no outline at all and only turn red and underlined, with nothing on the card.
- **Evidence:** the ring measures 1.69:1 on the page background and 1.80:1 on white, below the 3:1 that WCAG 1.4.11 requires for focus indicators. Computed outlines: clear button and checkboxes `auto 1px rgb(0, 95, 204)`; result link `none`. The home link uses the same faint color as a 3 px outline.
- **Why it matters:** a keyboard user cannot reliably see where they are, and accessibility is likely to be examined in an expert review.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-rpp-focus.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-pager.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-clear.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-link.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-search.png`
- **Direction:** define one solid focus color token with at least 3:1 contrast, offset from the control so it also reads on red. Set Atomic's ring variable to it and apply it to the home link and result links.

### Medium

#### UI-04: The controls row changes height and position with the state

- **Where:** search page status row, all widths.
- **What is wrong:** chips, the did-you-mean line and the lookup notice each insert a row above the sort and page-size controls, so those controls move as a person searches.
- **Evidence:** vertical center of the sort control:

| State | 1100 px | 1440 px |
|---|---|---|
| Default | 217 | 217 |
| Did you mean | 256 | 253.5 |
| One filter chip | about 260 | about 260 |
| Number lookup | 322 | 269.5 |

- At 1100 px the result summary gets only 164 px, so "Results 1-12 of 652 for fire" breaks onto two lines, and longer queries will take more.
- **Why it matters:** controls that move are harder to use, and the top of the results is unstable from search to search.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/dym-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/num25-1100.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/filter1-1100.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/q-fire-1100.png`
- **Direction:** keep summary, sort and page size in a fixed first row, and place chips, correction and notices below it. At 1100 px, reduce the width taken by the controls.

#### UI-05: The header, search box and results do not share an axis

- **Where:** search page, all widths.
- **What is wrong:** the title and search box center on the window, while the results center on the results column. The search box is narrower than the results and shares only its left edge with them, and even that alignment is a coincidence of the widths.
- **Evidence:** at 1440 px the search box spans 360 to 1080 (center 720), and the results span 360 to 1376 (center 868). At 1100 px the search box starts at 190 and the results at 320, so no edge matches. The left edge of the search box matches the results only when the 1312 px content block fits fully.
- **Why it matters:** this is the kind of near-alignment the owner has objected to. The eye finds a left edge at some widths, then loses it at others.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/home-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/home-1100.png`
- **Direction:** choose one structure. Either span the search box across the results column, or center it across the whole block and make that a clear, deliberate header.
- **Owner decision:** which of the two structures to use.

#### UI-06: Very wide screens leave half of the window unused

- **Where:** search page at 1920 and 2560 px.
- **What is wrong:** the layout stops growing at 1312 px of content, and the grid stays at four columns.
- **Evidence:** at 2560 px the margins are 624 px on each side, so 51% of the width is unused. Cards are 239 px wide at 1440, 1920 and 2560 px.
- **Why it matters:** a large monitor shows no more results than a laptop, though the design is otherwise spacious and it would not need to be dense to benefit.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/home-2560.png`
- **Direction:** consider a higher content limit and more columns above 1920 px, keeping the rule that page sizes fill every row.
- **Owner decision:** whether to add a wider layout, since page sizes depend on the column counts.

#### UI-07: The pager row separates from the results and touches the page bottom

- **Where:** search page, all widths. This concerns spacing, not the horizontal position of the pager.
- **What is wrong:** the pager's row sits below both the results and the facets, so opening the facets pushes it away from the results. On a normal page, it sits against the bottom of the document with no margin.
- **Evidence:** with both facets open at 1440 px, there is a gap of about 400 px between the last card (1180) and the pager. On the home page at 1440 px, the pager bottom is 1252 and the document height is 1252, so the bottom margin is 0.
- **Why it matters:** the pager appears disconnected from the content it controls, and the page looks cut off at the end.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/facets-open-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/home-1440.png`
- **Direction:** add a named bottom spacing, and anchor the pager below the results rather than below the taller of the two columns.

#### UI-08: Loading does not resemble the final page and shifts the layout

- **Where:** search page first load, all widths. Tested with the response delayed by 3.5 seconds at 1440 px.
- **What is wrong:** the skeleton is Atomic's generic text layout. It has no artwork area or card frame, its rows are spaced differently from real cards, and no placeholder appears for the facets, so the left column is blank and then fills in.
- **Evidence:** skeleton rows repeat every 216 px, real cards every 315 px. Cumulative layout shift during the load was 0.12 (0.0001 + 0.0072 + 0.1136), above the 0.1 threshold commonly treated as good. The combined controls placeholder ends at 1364, while the real controls end at 1376.
- **Why it matters:** the page is reassembled in front of the person each time it loads, and it is the first impression.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/loading-1440.png`
- **Direction:** match the placeholder to the real card proportions and reserve the facet column.

#### UI-09: The typed query looks like placeholder text, and its styling rule has no effect

- **Where:** search box, all widths.
- **What is wrong:** the rule `atomic-search-box::part(input)` in `src/theme.css` sets 18 px and weight 600, but Atomic has no such part. The input part is named `textarea`.
- **Evidence:** on the rendered page, part `input` has 0 matches and part `textarea` has 1. Computed input style is 16 px, weight 400, and `rgb(107, 102, 88)`, identical in color to the placeholder.
- **Why it matters:** the most important text on the page is pale and indistinguishable from a hint, against an intended stronger style.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-search.png`
- **Direction:** target the `textarea` part and use the foreground color for typed text.

#### UI-10: Short pages always scroll by a fixed 112 px

- **Where:** did-you-mean, number lookup, no results, and every detail state, at all widths.
- **What is wrong:** `main` has `min-h-screen` and sits below a 112 px header, so the document is always taller than the window.
- **Evidence:** in a 900 px window, the document is 1012 px tall with three results, one result, no results and on the not-found page. Content ends at 585 px with three results.
- **Why it matters:** a scrollbar with nothing to scroll to looks careless.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/dym-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/detail-notfound-1440.png`
- **Direction:** make the page a full-height column in which `main` fills the remaining height.

#### UI-11: Detail page loading, error and not-found states are unfinished

- **Where:** detail page, all widths. Tested at 1440 px.
- **What is wrong:** loading is the bare word "Loading…" in a heading. It uses none of the card structure, unlike the search page. The error says "Please try again" but gives no retry button. Not-found is two lines of text at the top of an empty page, with nothing beyond the small "Back to search" button.
- **Evidence:** loading and not-found content sit at 228 to about 290 px in an otherwise empty 1012 px page. The error state has only that text and the same button. Headings used for status mean "Loading…" and "Something went wrong" are announced as page structure, and no live region was added.
- **Why it matters:** these states are visibly less finished than the normal detail view, and Pokémon links are designed to be shared, so people can land on them directly.
- **Screenshots:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/detail-loading-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/detail-notfound-1440.png`
- **Direction:** use a skeleton in the shape of the detail card, add a retry action, and offer a search on not-found. Announce state changes with a status region.
- **Owner decision:** whether not-found should suggest close matches.

#### UI-12: The detail page feels separate from the search page

- **Where:** detail page, all widths.
- **What is wrong:** there is no search box on the page, so searching again requires going back first. The page's main heading is the site title, and the Pokémon's name is only a second-level heading. The content limit differs from the search page, and the "Back to search" button is styled differently from other controls.
- **Evidence:** headings are `H1: Pokémon Search`, `H2: Charizard`, `H3: Base stats`. The detail card is 976 px wide, compared with 1312 px of content on the search page. The back button is 36 px tall, compared with 40 px for sort, page-size and pager controls, and it has a thinner border and a drop shadow instead of the 2 px panel border.
- **Why it matters:** moving between pages changes widths and control styles, and assistive technology reports the site name rather than the Pokémon as the page's main heading.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/real-detail-1440.png`
- **Direction:** make the Pokémon's name the `h1` on this page, use the shared control style, and consider a compact search in the header.
- **Owner decision:** whether the detail page has a search box.

#### UI-13: Stat bars report no value to assistive technology

- **Where:** detail page, all widths.
- **What is wrong:** the shadcn `Progress` component uses `value` only for the visual bar and does not pass it to the Radix root.
- **Evidence:** the rendered bars have `data-state="indeterminate"` and no `aria-valuenow`, so each is exposed as a progress bar in an unknown state. They are also children of a `dl` group alongside the `dt` and `dd`.
- **Why it matters:** six indeterminate progress bars are announced for static numbers. The number itself is available, so the bars add only noise.
- **Screenshot:** `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/detail-1440.png`
- **Direction:** mark the bars as decorative with `aria-hidden`, or pass a real value. This is a behavior fix, not a style change to a generated file.

#### UI-14: `src/theme.css` relies on overrides of Atomic's page layout

- **Where:** `src/theme.css`.
- **What is wrong:** ten `!important` declarations override Atomic's layout grid, section sizes and status row. The grid override is tied to a repeated 1024 px breakpoint, and `--size-search-row` recomputes a height from border and box sizes. Several control values are literals, such as `height: 40px`, `min-height: 44px`, `margin: 6px` and `gap: 20px`, despite the project rule that each value is named once.
- **Evidence:** the `!important` rules are at lines 87 to 90, 100, 103, 104, 125, 134 and 152 of the file as audited. `docs/architecture.md` already records that Coveo does not document this approach.
- **Why it matters:** an Atomic upgrade can break the layout silently, as the dead rule in UI-09 shows. It also has to be defended to Coveo experts.
- **Direction:** reduce overrides to the grid itself, and move the status row into a plain flex container within the section. Name the remaining literals.

### Low

#### UI-15: Labels in the controls row are inconsistent

"Sort by:" and "Filters:" are 12 px, weight 800, with a colon. "Results per page" is 16 px, weight 400, without a colon, right next to them. Sort text is 15 px while page-size text is 16 px. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-sort.png`. Direction: use one label style.

#### UI-16: Icons in the search box are weak and undersized

The submit and clear targets are 32 by 32 px inside a 67 px box, smaller than the 40 px controls elsewhere. The clear icon is a thin line, in contrast to the bold chevrons used in the facets and sort control. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-focus-search.png`. Direction: use 40 px targets and a consistent icon weight.

#### UI-17: Facet header hover color has low contrast

On hover the label becomes `rgb(232, 87, 76)`, which is 3.56:1 on white, below 4.5:1 for 17 px text. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-hover-facet.png`. Direction: use the darker primary color.

#### UI-18: The suggestion panel does not match the search box

The panel starts directly against the box's heavy bottom edge, is about 2 px narrower on each side, and uses a thin border and a smaller radius than the box's 2 px border and 20 px radius. All text is muted. Suggestions on an empty box look arbitrary: fire, zacian, wish pokémon, stunky, stantler, stall, shadow pokémon, scaly pokémon. Screenshots: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/ta-focus-1440.png`, `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/z-ta-panel.png`. Direction: align the panel to the box and use the foreground text color. **Owner decision:** whether an empty box should show suggestions at all.

#### UI-19: Sort and page-size controls remain for very small result sets

With one result ("Result 1 of 1 for 25"), all four page sizes and the sort control remain visible and active. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/num25-1100.png`. **Owner decision:** whether to hide them when they cannot change anything.

#### UI-20: The lookup notice is long for its importance

At 1100 px, the "Pokédex lookup" badge and two lines of explanation take 99 px above a single card, the largest cause of the movement in UI-04. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/num25-1100.png`. Direction: shorten to one line. **Owner decision:** final wording.

#### UI-21: "Best match" is shown while the home page is in Pokédex order

The recorded decision accepts this. The label still describes an order that is not applied, and a Pokémon without a number shows an empty left slot on its card beside the Generation. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/last-1440.png`. **Owner decision:** whether to show "Pokédex number" when there is no query.

#### UI-22: Detail artwork is enlarged past its source size

Source artwork is 360 px wide and is displayed 406 px wide at 1 times pixel density, so it looks slightly soft and will look more so on high-density screens. Abilities also leaves an empty half row in the facts grid. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/real-detail-1440.png`. Direction: limit the artwork to its natural size, or find a larger source.

#### UI-23: Card links leave the application on the search branch

On `fix/code-review-findings`, a card links to pokemondb.net in the same tab. The detail page branch replaces this with `/?pokemon=Name`. Direction: confirm this on merge.

#### UI-24: Very long pages have no way back to the controls

At 96 results per page the document is 7891 px tall, and neither the search box nor the filters stay available while scrolling. Screenshot: `/private/tmp/claude-501/-Users-keelinsekerka-Dev-pokebowl-cove/808181cd-25b2-4575-b225-736be614d5af/scratchpad/ui-audit/size96-1440.png`. **Owner decision:** whether to keep the facets or search box in view.

## Decisions needed from the owner

| Finding | Decision |
|---|---|
| UI-01 | Error wording, and whether technical detail stays |
| UI-02 | Recovery actions when nothing is found |
| UI-05 | Search box across the results column, or centered across the whole block |
| UI-06 | A wider layout above 1920 px |
| UI-11 | Suggest close matches on not-found |
| UI-12 | A search box on the detail page |
| UI-18 | Suggestions on an empty box |
| UI-19 | Hide sort and page size for small result sets |
| UI-20 | Lookup notice wording |
| UI-21 | Sort label with no query |
| UI-24 | Keep filters or search in view while scrolling |

## What was not checked

- The server on port 5173 stopped responding near the end of the audit and was not restarted. Three checks therefore ran on port 5174: focus style of the selected page size and page number, status announcements, and the clear button. That build lacks recent layout fixes, but these behaviors come from the same code. The sort and page-size screens on 5173 were captured before it stopped.
- The horizontal position of the pager was excluded because it was being changed separately. Pager spacing in UI-07 was measured during that change and should be measured again after it lands.
- Real screen readers were not used. Accessibility findings come from the DOM, roles, live regions and computed styles.
- Browsers other than Chromium were not tested, nor were browser zoom, high-contrast mode or real slow networks. Loading was simulated by delaying the response.
- Result quality and relevance were out of scope. Type-ahead was checked for appearance only.
- Real artwork was viewed only on the home page and the Charizard detail page.
- Screen widths below 1100 px were out of scope.
