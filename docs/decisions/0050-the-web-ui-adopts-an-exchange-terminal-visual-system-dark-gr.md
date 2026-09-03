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
- **`--ok`/`--bad` for marks, `--ok-ink`/`--bad-ink` for text.** Binance's sell red
  (`#f6465d`) is 4.48:1 on the panel plane — just under the AA floor this app binds itself
  to. Rather than drop the colour, the text tokens are lifted (`#ff5c74`, 5.30:1) and the
  original stays on candles, fills and borders where contrast rules do not apply.

`docs/UI_CONSTRAINT.md` is unchanged and still holds: tokens carry every colour, four
states per screen, AA contrast, one icon family, one control height per row. Only
`DESIGN.md` — the visual system that law produced — was rewritten.

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

**Two red tokens and two green tokens instead of one each.** A reader has to know that
`--bad` paints a mark and `--bad-ink` paints text. That is one more thing to get wrong than
a single token, and the reason is a 0.02 contrast-ratio gap. Kept anyway, because the
alternative was either failing the app's own AA rule or shipping candles in a red that is
not the one the category uses.

**Density moved toward the terminal and away from the projector.** Body type is 14px and
table type 13px, where the old system argued for larger figures "readable from the back of
the room". The bet is that a dense dark table is more legible on a projector than a pale
one, and that the demo will be driven at a laptop. If a room ever disagrees, the fix is the
type scale in `tokens.css` and nothing else.

**PRODUCT.md's "an instrument rather than a trading floor" is now half-true.** The
anti-references it binds — the neon exchange with its gradients and blinking figures, and
the beginner investing app with its oversized arrows — are still respected: no gradients,
no glow, no badges that nudge, green and red still paired with a word. But the brand
sentence itself was written against the light system, and it has not been renegotiated
here. Whoever revisits the positioning should settle it there rather than in CSS.
