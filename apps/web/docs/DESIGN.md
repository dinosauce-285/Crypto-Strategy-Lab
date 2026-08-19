---
name: Crypto Strategy Lab
description: A laboratory for combining, backtesting and ranking crypto trading strategies.
colors:
  ink: "#2a251f"
  muted: "#6f6658"
  bg: "#faf9f6"
  surface: "#f4f1ea"
  line: "#e2dbce"
  accent: "#0b4f9c"
  ok: "#197e3a"
  bad: "#b3271e"
typography:
  title:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "1.4rem"
    fontWeight: 600
    lineHeight: 1.3
  heading:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  reading:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.76rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "3px"
  md: "6px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2.5rem"
components:
  segmented-item:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "2rem"
    padding: "0 0.5rem"
  segmented-item-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  segmented-item-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "2rem"
    padding: "0 0.5rem"
  reading:
    textColor: "{colors.ink}"
    typography: "{typography.reading}"
  reading-fresh:
    textColor: "{colors.accent}"
  data-table:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    padding: "0.35rem 0.6rem"
  state-line:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
---

# Design System: Crypto Strategy Lab

## 1. Overview

**Creative North Star: "The Instrument Face"**

This is the dial of a measuring device, not a trading floor. Figures are etched onto a
pale ground; the scale marks are thin and few; nothing on the surface is there to be
admired. Every line has to answer what it separates, and a line that cannot answer is
deleted. The ground is a warm off-white (`#faf9f6`) rather than white because an
instrument face is paper or enamel, never a lightbox, and the whole palette is one hue
family away from neutral so a single blue reads as deliberate when it appears.

Density serves reading at a distance before it serves cramming. The screen is judged in a
fifteen-minute demo over a projector, so figures are set in a size a room can read, and
the interface spends its space on the numbers rather than on frames around them. Where
density and legibility disagree, legibility wins — that is the one place this system is
deliberately less dense than a professional terminal.

It explicitly rejects the two shapes closest to this subject: the neon exchange, with its
purple-to-cyan gradients and blinking figures, and the beginner investing app, with
oversized green and red arrows that turn a backtest into advice. Both are loud in exactly
the register where this product needs to be trusted.

**Key Characteristics:**
- One monospace family for everything; the numbers align because they are meant to be compared.
- Warm off-white ground, ink-brown text, one blue accent used only for state.
- No shadows anywhere; depth is a change of ground plus a hairline.
- Controls are silent until touched.
- Four states on every surface — loading, empty, error, data — and none of them may be mistaken for another.

## 2. Colors

A near-neutral warm palette carrying one cool accent, with green and red reserved
strictly for outcome.

### Primary
- **Signal Blue** (`#0b4f9c`): the only accent. Focus rings, the selected item, and the
  moment a live figure changes. Never a background, never decoration.

### Neutral
- **Etched Ink** (`#2a251f`): all body text and every figure. A brown-black, not a pure
  black, so it sits on the warm ground without vibrating.
- **Scale Grey** (`#6f6658`): labels, column headers, timestamps, and any text that names
  a number rather than being one. Meets 4.5:1 on the ground, so it is legible, not decorative.
- **Enamel** (`#faf9f6`): the page ground.
- **Recessed Enamel** (`#f4f1ea`): the second plane — control backgrounds, selected
  segments, and any surface that must read as *behind* or *held*.
- **Hairline** (`#e2dbce`): the only divider. 1px, everywhere, no exceptions.

### Semantic
- **Confirmed Green** (`#197e3a`): a healthy check, a profitable result. Always paired
  with a word or a shape.
- **Refused Red** (`#b3271e`): an error state, a loss, a broken connection. Same pairing rule.

### Named Rules

**The Meaning-Only Rule.** Colour appears when it carries information and at no other
time. A heading is not blue because headings look nice blue; a panel is not tinted to
show it is a panel. If a colour cannot be explained by what it tells the reader, it is
removed.

**The Never-Alone Rule.** Green and red never carry meaning by themselves. Buy and sell,
profit and loss, up and down are all readable in greyscale through a word, a shape or a
position. A colour-blind reader and a black-and-white printout must reach the same
conclusion.

## 3. Typography

**Display Font:** none. This system has no display face and will not acquire one.
**Body Font:** the platform monospace stack (`ui-monospace`, `SF Mono`, `Menlo`, `Consolas`).
**Label/Mono Font:** the same family, one step down and in Scale Grey.

**Character:** one family, several weights and sizes. A monospace is chosen for a
non-decorative reason: every column of figures aligns without effort, and a price that
changes from `64,231.10` to `9,842.05` does not shift the layout under the reader's eye.
`font-variant-numeric: tabular-nums` is set anywhere digits stack.

### Hierarchy
- **Title** (600, 1.4rem, 1.3): the page name. Once per screen.
- **Heading** (600, 1rem, 1.4): a panel's name. Sits on the hairline that separates it from its content.
- **Reading** (400, 2rem, 1.1): the live figure — the one number a viewer is watching. This is the largest type in the system and it is always a measurement, never a word.
- **Body** (400, 1rem, 1.5): sentences. Capped at 65–75ch; state lines and explanations live here.
- **Data** (400, 0.84rem, 1.4): table cells. Right-aligned for figures, left for the first column, tabular numerals throughout.
- **Label** (400, 0.76rem, Scale Grey): column headers and the caption under a figure. Never uppercase-tracked.

### Named Rules

**The Biggest-Thing-Is-A-Number Rule.** The largest type on any screen is a measurement.
If a heading ever out-sizes the figure it introduces, the screen is advertising itself.

**The No-Kicker Rule.** No small uppercase tracked eyebrow above a section. A panel is
named by its heading and nothing else.

## 4. Layout

One centred column, 46rem wide, with 3rem of air above the title and 1.5rem at the sides.
A screen is a stack of named panels separated by space, not a grid of boxes: 2.5rem
between panels, 1rem inside one, 0.5rem between controls that belong together. Rhythm
comes from those four steps and nothing else.

Panels head with their name on a 1px Hairline, and the controls that scope a panel sit on
that same line — the pair, the timeframe, and later the dataset. Anything that changes
what a panel shows lives on the panel's own head, never in a global toolbar.

Responsive behaviour is structural. The control row wraps before it shrinks, tables scroll
inside their own container so the page never scrolls sideways, and type sizes do not
change with the viewport: a figure read from the back of a room is the same size on a
laptop and on a projector.

### Named Rules

**The Column Rule.** One column, one reading order. Two columns arrive only when two
things are genuinely being compared side by side, and then the comparison is the point of
the screen.

## 5. Elevation & Depth

There are no shadows in this system and none will be added. Depth is a change of ground
plus a hairline: a surface that must read as held or recessed uses Recessed Enamel
(`#f4f1ea`) against the page's Enamel (`#faf9f6`), and a boundary between regions is a 1px
Hairline. Two planes is the entire vocabulary, which is what an instrument face has.

The one future exception is a floating layer that genuinely overlaps content — a dropdown
or a dialog. When one arrives it earns exactly one shadow token, defined then, and it must
be the only thing in the system that has one.

### Named Rules

**The Two-Plane Rule.** Ground and held. Anything that appears to need a third plane is
a layout problem wearing a costume.

## 6. Shapes

Two radii and no more: 3px for something inline (a code span, a tag), 6px for something
you can operate (a control, a select, a segment). Everything else is square, including
panels and tables, because an instrument face is ruled, not rounded.

Borders are 1px Hairline or they are absent. There is no 2px border in this system, no
coloured stripe down the side of anything, and no border whose job is decoration — a rule
either separates two things or it goes.

### Named Rules

**The Operable-Corner Rule.** A rounded corner means the thing can be operated. If it
cannot be clicked, typed into or selected, it is square.

### Browser surfaces

The parts nobody draws still belong to the system. Text selection is Hairline behind
Etched Ink, not the browser's blue. Scrollbars on a scrolling container are thin, Hairline
at rest and Scale Grey on hover, on a transparent track. `color-scheme: light` is declared
so native controls and the page's own scrollbar match the ground rather than the operating
system's idea of a form. Headings carry `text-wrap: balance`.

## 7. Components

### Segmented control (timeframe)
- **Character:** silent until touched.
- **Shape:** 6px radius, 2rem tall, 2.75rem minimum width so the six timeframes form an even rhythm.
- **Rest:** transparent background, transparent 1px border, Scale Grey text. It reads as a row of words.
- **Hover:** Recessed Enamel background, Etched Ink text.
- **Selected:** Recessed Enamel background, Hairline border, Etched Ink text, `aria-pressed="true"`. Selection is carried by three changes at once, so it survives greyscale.
- **Focus:** 2px Signal Blue outline, 1px offset. Never removed.

### Select (pair)
- **Style:** Recessed Enamel background, 1px Hairline border, 6px radius, 2rem tall — the
  same height as the segmented control beside it. One control height per row is a rule, not a coincidence.
- **Focus:** the same 2px Signal Blue outline. Every focusable thing focuses identically.

### Live reading
- **Character:** the subject of the screen.
- **Style:** 2rem, tabular numerals, Etched Ink, with its caption in Label beside it on the baseline.
- **State:** on arrival the figure takes Signal Blue for 180ms and returns to Etched Ink on an ease-out curve. It says *something arrived*, and deliberately does not say *up* or *down* — a direction is a computed claim and this layer does not make claims.
- **Stale:** when the channel drops, the last figure stays on screen in Scale Grey with its caption changed to "stale — last seen HH:MM:SS". It is never wiped (the reader loses their place) and never left in ink (it would read as live). The word carries the meaning; the colour only reinforces it.
- **Reduced motion:** the transition is removed; the value simply replaces itself.

### Provenance line
- **Character:** the panel's receipt, and the smallest type on the screen.
- **Style:** Label size, Scale Grey, at the foot of the panel it belongs to.
- **Content:** the topics this panel is subscribed to, verbatim (`market:BTCUSDT:price · market:BTCUSDT:1m`). It names where the numbers came from without the browser learning which exchange is behind them — that is the adapter's business, not the screen's.

### Data table
- **Style:** no outer border, no zebra striping, no card. 1px Hairline under each row and
  none under the last. Header row in Label / Scale Grey.
- **Alignment:** figures right, the first column left, tabular numerals throughout.
- **Density:** 0.35rem vertical padding. Denser than prose, looser than a terminal, because of the projector.
- **Overflow:** the table scrolls inside its own container; the page never scrolls sideways.

### State lines
- **Character:** a sentence, not an icon.
- **Loading:** "Opening the channel…" — says what is being waited on.
- **Empty:** names what is subscribed and what would end the wait, so silence is distinguishable from a quiet market.
- **Error:** Refused Red, says what broke, what to run, and whether it recovers on its own.
- **Data:** the figure and its table.

## 8. Do's and Don'ts

### Do:
- **Do** put the largest type on the measurement, and keep headings at 1rem–1.4rem.
- **Do** convey depth with Recessed Enamel plus a 1px Hairline, never a shadow.
- **Do** give every focusable element the same 2px Signal Blue outline at 1px offset.
- **Do** set `font-variant-numeric: tabular-nums` wherever digits stack, so a changing price does not move the layout.
- **Do** write all four states as sentences that name what is happening and what to do next.
- **Do** pair every green or red with a word or a shape, so the meaning survives greyscale.
- **Do** keep one control height per row (2rem) and one radius family (3px / 6px).

### Don't:
- **Don't** build **a neon crypto exchange**: no purple-to-cyan gradients, no blinking figures, no badges, no glow.
- **Don't** build **a beginner investing app**: no oversized green and red, no arrows, no magnified percentages, nothing that nudges.
- **Don't** add a `box-shadow`. The system is flat; a shadow is the tell that a card was reached for instead of a layout.
- **Don't** wrap content in cards, and never nest one inside another.
- **Don't** add a second font family, and never a display face.
- **Don't** put a small uppercase tracked eyebrow above a section.
- **Don't** use `border-left` thicker than 1px as a coloured accent stripe.
- **Don't** compute a percentage, a direction or a profit in a component to colour something — if the number is not in the response, the API is what changes.
