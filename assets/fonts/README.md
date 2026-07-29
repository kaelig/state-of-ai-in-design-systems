# Hanken Grotesk, for the social card

`scripts/build_og.mjs` rasterises the Open Graph card, and these are the faces it
draws with. Nothing else in the repository reads them: the site itself loads
Hanken Grotesk from Google Fonts.

They are here so the render is deterministic. The build stops depending on
`fonts.gstatic.com` being reachable, and an upstream revision of the font can no
longer reflow the card with no commit behind it.

## Why three files rather than the variable font

`@resvg/resvg-wasm` loads a variable font but renders its default instance: it
has no `wght` axis support, so a single file draws every weight as Regular.
Three static instances are the way to get three weights out of it. 400 sets the
stats line, 600 the eyebrow and the byline, 750 the title.

## Reproducing them

Upstream is [`ofl/hankengrotesk`](https://github.com/google/fonts/tree/main/ofl/hankengrotesk)
in the Google Fonts repository, which ships the variable font and no static cuts.
`HankenGrotesk[wght].ttf` was instanced at each weight with `fonttools` 4.60.1:

```sh
for w in 400 600 750; do
  fonttools varLib.instancer -o "HankenGrotesk-$w.ttf" "HankenGrotesk[wght].ttf" "wght=$w"
done
```

TTF and not WOFF2, though WOFF2 would be a third of the size: resvg's decoder
aborts the whole wasm module on a WOFF2 carrying the standard `glyf` transform,
which is what `fonttools ttLib.woff2 compress` writes by default. Passing
`--no-glyf-transform` produces one it accepts, but a font file that loads only
because it avoids a decoder bug is a trap for whoever re-vendors these. TTF is
the format resvg reads without qualification.

## Licence

Hanken Grotesk is licensed under the SIL Open Font License 1.1, and `OFL.txt` is
its copy. That covers the font files committed here.

It does not reach the site. Rasterising text into a PNG does not distribute the
font, so nothing the report publishes carries an OFL obligation — which is why
this sits beside the fonts rather than next to `LICENSE` and `LICENSE-DATA`, and
why the repository's split between MIT code and CC BY 4.0 data is unchanged.
