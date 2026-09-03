---
name: Crypto Strategy Lab
description: A laboratory for combining, backtesting and ranking crypto trading strategies.
colors:
  bg: "#181a20"
  surface: "#1e2329"
  raised: "#2b3139"
  line: "#2b3139"
  lineStrong: "#363a45"
  ink: "#eaecef"
  muted: "#848e9c"
  faint: "#5e6673"
  accent: "#fcd535"
  accentPress: "#f0b90b"
  onAccent: "#202630"
  ok: "#0ecb81"
  bad: "#f6465d"
  okWash: "#10251d"
  badWash: "#2a1a1e"
  accentWash: "#2a2413"
typography:
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  heading:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  reading:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.3
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.85rem"
  lg: "1.25rem"
components:
  btn-action:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.75rem"
  btn-action-hover:
    backgroundColor: "{colors.lineStrong}"
  btn-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.onAccent}"
    fontWeight: 600
  btn-primary-hover:
    backgroundColor: "{colors.accentPress}"
  pair-select:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.6rem"
  seg-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    height: "1.75rem"
  seg-item-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.accent}"
    fontWeight: 600
  panel-box:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.85rem"
  data-table:
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    padding: "0.45rem 0.6rem"
  data-table-row-hover:
    backgroundColor: "{colors.raised}"
  badge-pos:
    textColor: "{colors.ok}"
    backgroundColor: "{colors.okWash}"
  badge-neg:
    textColor: "{colors.bad}"
    backgroundColor: "{colors.badWash}"
  state-line:
    textColor: "{colors.muted}"
    typography: "{typography.data}"
---

# Design System: Crypto Strategy Lab

## 1. Overview

**Creative North Star: "The Exchange Terminal"**

This is the room where the numbers are worked, not a report about them. The ground is the
near-black an exchange uses because candlesticks in green and red have their highest
contrast against it, and because the people who read this screen have read a hundred like
it — the familiarity is the feature. Panels are unbordered slabs a shade lighter than the
ground; a boundary is a change of plane or a hairline, never a frame drawn for its own
sake. One amber carries every decision the reader can make.

Density serves the task. Body type is 14px, table type 13px, and a screen fills its width
because a wide table beats a narrow one. Where a figure and a label compete, the figure is
in mono and the label is in sans, so a column of prices aligns without the sentence beside
it looking like output.

It explicitly rejects the two shapes closest to this subject and nearest to a casino: the
**neon exchange** — purple-to-cyan gradients, glow, blinking figures, badges that
celebrate — and the **beginner investing app** — oversized arrows, magnified percentages,
anything that nudges. Dark and amber is the category's working uniform; gradients and glow
are its costume.

**Key Characteristics:**
- Three planes: ground `#181a20`, panel `#1e2329`, raised control `#2b3139`.
- One accent, amber `#fcd535` — primary action, current tab, current selection, nothing else.
- IBM Plex Sans for words, IBM Plex Mono for figures. One superfamily, two genres.
- A top bar and a live ticker rail; the screen below them is full width.
- Four states on every surface — loading, empty, error, data — and none of them may be
  mistaken for another.

## 2. Colors

Three neutral planes, one amber accent, and green/red reserved strictly for direction.

### Primary
- **Amber** (`#fcd535`): the only accent. Primary buttons, the current tab, a selected
  card's border and wash, the MA overlay, the top three ranks, every focus ring. Its
  pressed state is `#f0b90b`; text on it is `#202630`.

### Neutral
- **Ground** (`#181a20`): the page.
- **Panel** (`#1e2329`): a surface holding data. No border — the plane change is the edge.
- **Raised** (`#2b3139`): anything you operate. Buttons, fields, hovered rows, pills.
- **Ink** (`#eaecef`): body text and every figure.
- **Muted** (`#848e9c`): labels, column headers, state sentences. 5.2:1 on the ground and
  4.8:1 on a panel, so it is legible rather than decorative.
- **Faint** (`#5e6673`): a disabled control's text, and the neutral segment of a bar.
- **Hairline** (`#2b3139`) and **strong hairline** (`#363a45`): the only dividers, 1px.

### Semantic
- **Up / buy** (`#0ecb81`) and **down / sell** (`#f6465d`). One value each, for marks and
  for text alike: candles, volume bars, chart markers and bar segments take the same red
  and green a reader sees in a profit column. The red measures 4.48:1 on a panel — a
  hair under the AA floor — and is kept anyway, because the alternative is a red that is
  not the category's. `UI_CONSTRAINT.md` names and bounds that exception; ADR 0050 records
  the call.
- **Washes** (`#10251d`, `#2a1a1e`, `#2a2413`) are the grounds a coloured pill sits on.
  They are *darker* than the plane behind them, not a transparent tint of the colour: a
  tint lightens the ground and drags the text on it down with it — which is how the muted
  sub-label on a selected strategy card ended up at 4.01:1.

### Named Rules

**The Meaning-Only Rule.** Colour appears when it carries information and at no other
time. A heading is not amber because headings look good amber; a panel is not tinted to
show that it is a panel.

**The Never-Alone Rule.** Green and red never carry meaning by themselves. Buy and sell,
profit and loss, up and down are readable in greyscale through a word, a shape or a
position. A colour-blind reader and a black-and-white printout reach the same conclusion.

**The One-Red Rule.** There is one red and one green, and a mark and a sentence use the
same one. A second value tuned for a background is how a palette starts drifting, and it
asks every future author to know which of two nearly identical tokens they want.

## 3. Typography

**Body / UI font:** IBM Plex Sans (400 / 500 / 600).
**Figure font:** IBM Plex Mono (400 / 500 / 600).

**Character:** one superfamily in two genres. The sans carries every word — headings,
labels, buttons, sentences — so prose reads as prose. The mono carries every figure, so a
price changing from `64,231.10` to `9,842.05` does not shift the row under the reader's
eye. `font-variant-numeric: tabular-nums` is set wherever digits stack.

### Hierarchy
- **Title** (Sans 600, 1.125rem): the page name. Once per screen, with its subtitle on the
  same baseline.
- **Heading** (Sans 600, 0.9375rem): a panel's name, sitting on the hairline that separates
  it from its content.
- **Body** (Sans 400, 0.875rem): sentences, capped at 65–75ch.
- **Reading** (Mono 500, 1rem): a metric's value.
- **Data** (Mono 400, 0.8125rem): table cells. Figures right, the first column left.
- **Label** (Sans 400, 0.75rem, Muted): column headers, a figure's caption, provenance.
  Never uppercase-tracked.

### Named Rules

**The Figure-Is-Mono Rule.** If it is a measurement, it is set in the mono. If it is a
word, it is set in the sans. A table cell that holds a sentence takes `.text-cell` and
switches back to the sans.

**The No-Kicker Rule.** No small uppercase tracked eyebrow above a section. A panel is
named by its heading and nothing else.

## 4. Layout

A fixed shell of three rows: the 3.5rem top bar, the 2.25rem ticker rail, and the screen,
which scrolls inside itself so the page never moves. The top bar holds the brand mark, the
five screens, and the channel status — the one thing true on every screen.

A screen is a head plus a body. The body is `1fr` and a 20rem side rail: the subject on the
left, the controls and the readouts on the right. Panels are separated by 0.85rem and
nothing else; inside one, 0.6rem; between controls that belong together, 0.5rem.

Responsive behaviour is structural. The brand wordmark drops below 900px. Below 720px the
side rail moves under the main column, the four-chart grid becomes four full-width rows,
and — this is the part that bites — the desktop layout's height-filling (`flex: 1` plus
`min-height: 0`) is switched off, because a collapsed track lets a tall child paint over
whatever is stacked below it. Tables scroll inside their own container; the page never
scrolls sideways.

### Named Rules

**The Height-Handoff Rule.** `.grows` (`flex: 1; min-height: 0`) belongs only on a box
that contains its own scroller or a chart. Put it on a box that is just a stack of text and
that text will overflow onto the next panel.

## 5. Elevation & Depth

Depth is a change of plane: ground, panel, raised. Three values, and a 1px hairline where
two regions meet inside one plane. No panel has a shadow and none will get one.

The exception is a layer that genuinely floats over content: the dropdown menu and the
modal, which carry the system's only two shadow tokens (`--shadow-menu`, `--shadow-modal`)
plus the modal's `--overlay` scrim. Nothing else in the system may reference them.

### Named Rules

**The Three-Plane Rule.** Ground, panel, operable. A box inside a box gets no third
background — `.panel-box` inside a `.panel-box` flattens itself on purpose.

### Browser surfaces

`color-scheme: dark` is declared on the root and in the document head, so native controls,
the date picker and the page's own scrollbar match the ground instead of the operating
system's idea of a form, and the browser paints the dark ground before the stylesheet
lands. Text selection is `--accent-dim` behind Ink, not the browser's blue. Scrollbars are
8px, strong-hairline at rest and Muted on hover, on a transparent track. Headings carry
`text-wrap: balance`.

## 6. Shapes

Three radii: 4px for a control or a pill, 8px for a panel, 12px for a modal. Everything
else is square.

Borders are 1px and they either separate two things or they go. There is no 2px border in
this system, no coloured stripe down the side of anything, and a selected card is marked by
its border *plus* a wash of the same hue, so the state survives greyscale.

### Named Rules

**The Operable-Corner Rule.** 4px means you can operate it; 8px means it holds something;
12px means it floats over the page.

## 7. Components

### Top bar
- **Structure:** brand (mark + wordmark) · the five screens · channel status, pushed right.
- **Tab rest:** Muted text, transparent. **Hover:** Ink on Panel. **Current:** Amber text
  at 600 — two changes at once, so it survives greyscale.
- The nav scrolls horizontally without a visible scrollbar rather than wrapping.

### Ticker rail
- **Character:** the last trade on every watched pair, on every screen.
- **Style:** Panel ground, 2.25rem, one hairline under it. Pair in Muted; price in Mono,
  coloured by the side the server sent (`data-side`), with the side spelled out beside it.
- **Stale:** when the channel drops the colour is dropped with it, the price holds its last
  value, and the rail says "Mất kết nối — giá đang đứng yên." A dash means nothing has
  arrived yet.
- It reports only what the message carried. There is no 24h change and no direction arrow,
  because neither is in the payload and the browser computes nothing.

### Channel status pill
- Three states, each carrying a dot *and* a word: `live` green, `connecting` muted,
  `down` red with a red border. `role="status"`.

### Segmented switcher (timeframe, coin)
- **Shape:** a Panel trough with 2px of padding; items 1.75rem, 4px radius.
- **Rest:** Muted on transparent. **Hover:** Ink on Raised. **Selected:** Amber at 600 on
  Raised, `aria-pressed="true"`.

### Buttons
- **`.btn-action`** — Raised, Ink, 4px, 2rem. Hover to strong-hairline, active back to
  Panel, disabled to Faint text.
- **`.btn-primary`** — Amber, `--on-accent` text, 600. One per screen region.
- **`.btn-ghost`** — transparent with a strong-hairline border, for a secondary action
  inside a panel that already has a primary one.
- **Modifiers:** `.btn-lg` (2.5rem), `.btn-sm` (1.625rem), `.btn-block`, `.btn-step`.
- A button dropped straight into a `.panel` aligns to the start rather than stretching;
  `.btn-block` opts back in.

### Fields
- One class, `.pair-select`, for selects, text, number and date inputs, so a row of them
  shares a height without anyone remembering to match it. Raised, borderless at rest,
  strong-hairline on hover, `--bad` border when `aria-invalid`.
- **Error text:** `.field-error`, 0.75rem, down-ink. A sentence, not a symbol.

### Data table
- **Style:** no outer border, no zebra. A hairline under each row and none under the last.
  Header row in Label / Muted, `position: sticky` against the panel's own ground so it
  survives a long scroll.
- **Alignment:** figures right, the first column left, mono throughout; a cell holding a
  sentence takes `.text-cell`.
- **Interaction:** a `role="button"` row hovers to Raised; the selected row keeps that
  ground and takes a 2px amber bar inset on its first cell.
- **Overflow:** `.table-scroll` (plus `.table-scroll-capped` where a chart shares the
  panel). The page never scrolls sideways.

### Figures
- **`.stat-tile`** is a label above a value with no frame — the grid's own gaps do the
  separating, because a box inside a panel is a box inside a box. The grid is
  `repeat(auto-fit, minmax(8rem, 1fr))`, so it is two-up in the side rail and four-up
  across a wide panel without a breakpoint per home.
- A value takes `.ok` / `.bad` only when direction is the point; `.stat-tile-note` carries
  the band it falls in ("Tốt (>1.5)"), so the colour is never the only signal.

### Badges
- Tinted pills, no border: `badge-pos` (up-ink on a 12% green wash), `badge-neg`,
  `badge-neu` (Muted on Raised), `badge-key` (Amber on a 12% amber wash). Always a word,
  never a bare dot.

### Chart
- Background transparent — the panel is the frame; no border, no radius of its own.
- Grid, axis borders, crosshair and series colours all read the token file at construction
  time, so the theme is one file and not a sweep through chart options.
- Candles use `--ok` / `--bad`; the MA overlay uses `--accent`; support and resistance use
  `--ok` / `--bad` with a label each.
- **`.chart-status-row`** is a real flow row above the chart, right-aligned, holding the
  connection badge; the timeframe pill is absolutely positioned at its left. An overlay was
  tried and collided with the chart's own price-scale labels.
- **Stale:** the chart drops to 40% opacity and a banner says since when. It is never wiped
  (the reader loses their place) and never left at full strength (it would read as live).

### Stages (loading / empty / error)
- **`.stage`** is a centred column on the Panel plane with a 17.5rem floor, so the screen
  does not jump when data lands. `.stage-dashed` for an empty state that is waiting on the
  reader rather than on the server.
- **Loading:** says what is being waited on. **Empty:** says what would end the wait.
  **Error:** down-ink, says what broke and offers the retry. Every one of them is a
  sentence.

### Modal
- 12px radius, Panel ground, strong-hairline border, `--shadow-modal`, over the `--overlay`
  scrim. It fades and rises 6px in 180ms, and does neither under
  `prefers-reduced-motion: reduce`.
- Focus is trapped, Escape closes, and focus returns to whatever opened it.

## 8. Motion

120ms for a hover, 180ms for a state change, on `cubic-bezier(0.25, 1, 0.5, 1)`. Colour,
opacity, transform and width only — never a layout property. No bounce, no elastic, no
entrance choreography: the reader is in a task.

Every transition has a `prefers-reduced-motion: reduce` branch that removes it rather than
shortening it.

## 9. Do's and Don'ts

### Do:
- **Do** set figures in the mono and words in the sans.
- **Do** convey depth with the three planes plus a 1px hairline, never a shadow.
- **Do** give every focusable element the same 2px amber ring at 1px offset.
- **Do** pair every green or red with a word or a shape, so the meaning survives greyscale.
  This is what pays for the red's 4.48:1, so it is not optional here.
- **Do** write all four states as sentences that name what is happening and what to do next.
- **Do** keep one control height per row (2rem) and one radius family (4 / 8 / 12).

### Don't:
- **Don't** build **a neon exchange**: no gradients, no glow, no blinking figures, no
  celebratory badges.
- **Don't** build **a beginner investing app**: no oversized arrows, no magnified
  percentages, nothing that nudges.
- **Don't** add a `box-shadow` outside the dropdown and the modal.
- **Don't** nest a `.panel-box` inside a `.panel-box` and expect a third background.
- **Don't** put `.grows` on a box that is only a stack of text.
- **Don't** add a third font family, and never a display face.
- **Don't** put a small uppercase tracked eyebrow above a section.
- **Don't** use `border-left` thicker than 1px as a coloured accent stripe.
- **Don't** compute a percentage, a direction or a profit in a component to colour
  something — if the number is not in the response, the API is what changes.
