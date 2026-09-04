# The web UI adopts an exchange-terminal visual system: dark ground, one amber accent, dense data tables

## Why this

The screen is judged in a fifteen-minute demo, and the audience already knows what a
trading terminal looks like. The previous system — a warm off-white "instrument face" with
a blue accent and one monospace family for every word — was internally consistent but read
as a spreadsheet about crypto rather than a place where crypto gets traded. Asked for the
look of a professional exchange, we took it literally and replaced the palette, the type
pairing and the shell.

Concretely:

- **Ground `#181a20`, panel `#1e2329`, raised `#2b3139`.** Three planes, darkest at the
  back. A dark ground is what every reader of this category expects, and candlesticks in
  green and red have their highest contrast against it.
- **One accent, amber `#fcd535`.** Primary action, current tab, current selection, the
  MA overlay, the top three ranks. Nothing else.
- **IBM Plex Sans for words, IBM Plex Mono for figures.** One superfamily in two genres,
  so labels read as prose and columns of numbers still align. The old mono-everything
  setting made a sentence look like output.
- **Top bar instead of a side rail,** with a live ticker rail under it. It buys back a
  10.5rem column for the charts and puts the last trade on every screen, which is what the
  category does and what this product's own "the number is the subject" principle wants.
- **One red and one green,** `#f6465d` and `#0ecb81`, for marks and for text alike. The
  red measures 4.48:1 on the panel plane, 0.02 under the AA floor this app binds itself
  to. The first cut of this system dodged that with a second, lighter pair for text; the
  product owner looked at both and kept the exchange's own value, because a red that is
  not the category's red costs more than the 0.02 does. `UI_CONSTRAINT.md` now names and
  bounds that exception rather than being quietly violated by the code.

- **Washes are darker than the plane behind them,** not a transparent tint of the colour.
  A 12% tint lightens the ground under the very text it is meant to set off; it had the
  muted sub-label on a selected strategy card at 4.01:1. Three flat dark grounds
  (`#10251d`, `#2a1a1e`, `#2a2413`) put every pill and every selected card back over 4.5:1.

`docs/UI_CONSTRAINT.md` keeps every other rule unchanged — tokens carry every colour, four
states per screen, one icon family, one control height per row — and gains the bounded
contrast exception above. `DESIGN.md`, the visual system that law produced, was rewritten.
`PRODUCT.md`'s brand sentence was rewritten too: "an instrument rather than a trading
floor" was written against the light system, and the honest replacement separates the
*surface* (which is now deliberately the category's) from the *manner* (which is still a
bench, not a venue).

## What else we looked at

**Keep the light instrument face and only tighten it.** Cheapest, and it kept a system
whose reasoning was already written down. Rejected because the request was explicitly for
the exchange look, and no amount of tightening a warm off-white gets there.

**Dark ground, keep the blue accent.** Would have preserved one decision instead of
replacing two. Rejected because blue-on-dark reads as a generic admin panel; the amber is
what makes the category legible at a glance, and the app already reserves green and red
for direction so a third hue would have had to mean something.

**Copy Binance's assets outright** — their wordmark, their logo, their component CSS.
Rejected: passing off another company's identity is not ours to ship. What is copied is
the design language (dark terminal, amber accent, dense tables, tinted status pills),
which is common to the category; the brand mark is drawn here, in the app's own icon
family, and the favicon is the same drawing.

## Trade-offs

**The theme is now a one-way door for the token file, not for the components.** Every
colour still resolves through `--bg` / `--surface` / `--ink` / `--accent`, and
`lightweight-charts` reads the same variables at construction time, so a future light mode
is a second block of token values — not a sweep through JSX. What is *not* free is going
back: the light palette's reasoning now lives only in git history and this record.

**A measured accessibility shortfall, on the record.** `--bad` is 4.48:1 on a panel and
3.72:1 on a hovered table row, against a 4.5:1 rule this project wrote for itself. Nothing
about the Never-Alone rule makes that free: a reader with low vision still has to work
harder on a red figure than on a white one, and "the word beside it carries the meaning"
answers comprehension, not legibility. What it buys is a palette that is the category's
rather than an approximation of it, and one token instead of two. If anyone revisits this,
the cheapest lever is the panel: `--surface` is what the red is measured against, and
darkening it a step clears the bar without touching the red.

**Density moved toward the terminal and away from the projector.** Body type is 14px and
table type 13px, where the old system argued for larger figures "readable from the back of
the room". The bet is that a dense dark table is more legible on a projector than a pale
one, and that the demo will be driven at a laptop. If a room ever disagrees, the fix is the
type scale in `tokens.css` and nothing else.

**The brand sentence now has to do more work.** "A working terminal rather than a
showroom" draws the line between borrowing the category's surface and borrowing its
manner, and the second half of that is not enforceable by a linter the way a colour token
is. Nothing stops a future screen from being an exchange in the way this record says it
must not be — a celebratory badge, a countdown, a figure enlarged because it is good news
— except somebody noticing in review. The old sentence was easier to hold to precisely
because it forbade the whole aesthetic.
