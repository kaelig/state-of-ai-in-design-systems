# Platform marks, for the three Simple Icons does not carry

`scripts/build_dashboard.py` reads these at build time and inlines their path
geometry into the payload, next to the geometry it reads out of
`node_modules/simple-icons/icons/` for Figma, Storybook and Penpot. Nothing
serves these files: `netlify.toml` publishes `dashboard/` only, so the browser
never fetches them and they are build inputs the way `assets/fonts/*.ttf` are.

They exist because `simple-icons` covers three of the six platforms in
`data/platforms.json` and not the other three. Supernova, Knapsack and
zeroheight each return a 404 against the package's icon set, so a record naming
one of them has nowhere to resolve from unless the mark is vendored here.

## The shape they have to be

Every file in this directory is the same shape as a Simple Icons file, because
the build enforces one contract across both sources and refuses to continue on a
file that breaks it:

- `viewBox="0 0 24 24"`, exactly
- at least one `<path>`, and nothing that carries a color
- no `fill`, `stroke`, `style`, `class` or `id` attribute anywhere in the file

The color rule is what makes the marks monochrome by construction rather than by
convention. The render helper wraps them in `fill="currentColor"`, so each mark
takes the ink of the heading it sits in and follows the theme without a token of
its own.

## Where each one came from

None of these three publishes a brand page, a press page, or a media kit, and
none publishes a standalone glyph. Every mark here was isolated from a
lockup — the symbol taken, the wordmark dropped — which is a modification, and
is recorded as one.

Each was scaled to fit the 24-unit box on its longer axis, centered on the
shorter one so the proportions survive, and its coordinates rounded to two
decimals. No letterform was redrawn and no proportion was altered.

### `supernova.svg`

Retrieved 2026-07-31 from the header lockup on <https://www.supernova.io/>, an
inline `<svg>` 146×28 whose symbol and wordmark are one merged `<path>`. The
first six subpaths are the symbol; the remaining thirteen are the letters. Split
the path into subpaths, kept the six, scaled 27.97 → 24.

Supernova is the one of the three that publishes terms bearing on its marks. Its
[Terms & Conditions](https://www.supernova.io/legal/terms-and-conditions), under
the heading "Supernova content", read:

> Unless agreed otherwise in writing, nothing in the Terms gives you the right to
> use Supernova's brand names, trademarks, Service marks, logos, domain names, or
> other distinctive brand features in a way that could cause confusion. You must
> not remove, alter, or obscure any such names, marks, or copyright notices.

The mark is used here to identify Supernova on a page about Supernova, which is
the opposite of causing confusion. Isolating the symbol from the lockup and
rendering it in one color is nonetheless an alteration, so it is stated plainly
rather than argued away.

### `knapsack.svg`

Retrieved 2026-07-31 from
<https://cdn.prod.website-files.com/61826e16a7bbc91004c691b8/63f598280fac8711dfc93430_logo-knapsack-1.svg>,
the color lockup the site's own header loads. Its symbol is three separate paths
in three brand colors — `#42247F`, `#6436BF`, `#E43A5C` — and its wordmark starts
past x=41. Kept the three symbol paths, dropped the wordmark, and let the three
merge into one path: they union into the same silhouette the color version
draws, so the K survives losing its color planes.

The white lockup at `63f6c561c991f9c72ad82cdc_Knapsack-Logo-white.svg` is the
same artwork already flattened to one color, and would have been the shorter
route. The color file was used instead because its three paths are the reason
the flattening is checkable: rendering them side by side is what proves the
union reads as the mark rather than as a blob.

Knapsack publishes no terms bearing on its marks. `/legal/terms` returns its
404 page in a browser, the footer links only a privacy policy and a security
page, and the privacy policy contains no trademark, logo or brand clause.

### `zeroheight.svg`

Retrieved 2026-07-31 from the header lockup on <https://zeroheight.com/>, an
inline `<svg viewBox="0 0 125 25">`. Its symbol is four paths, all `#FF4852`, all
left of x=25; the wordmark starts at x=28.76. Kept the four, dropped the rest.
This is the one mark that loses nothing to the monochrome treatment — it was
already drawn in a single color.

zeroheight's [Website Terms](https://zeroheight.com/terms/) exist and carry no
trademark, logo or intellectual-property clause. The page is client-rendered,
which is why a fetcher reading the raw HTML sees an empty shell and can report
its absence as an absence of terms; it was read in a browser.

## Reproducing one

There is no one-line command, because every source is a lockup and the symbol
has to be separated from the wordmark before anything else happens. The steps
are the same for all three:

1. Open the platform's site in a browser and find the lockup. Two of the three
   deliver it as inline `<svg>`, which a text-mode fetcher cannot see — an
   automated sweep of all three reported no marks at all.
2. Measure every subpath with `getBBox()` and keep the ones left of the
   wordmark. A path whose subpaths start with a relative `m` needs the current
   point tracked from the start of the path to know where each one really
   begins, so splitting on `M` alone gets it wrong.
3. Scale the union of the kept subpaths by `24 / max(width, height)` and center
   it on the shorter axis. Arc radii scale with the coordinates; arc flags do
   not.
4. Write one `<path>`, no attributes, into the skeleton the other files use.

## Trademarks

These are third-party trademarks, reproduced to identify the products this
report covers. Their owners have not endorsed or reviewed this report.

The repository's own licenses do not extend to them: MIT covers the code and
CC BY 4.0 covers the data, and neither grants anyone a right to Supernova's,
Knapsack's or zeroheight's marks. `assets/fonts/README.md` makes the equivalent
point about the OFL not reaching the site, and for the same reason — a license
on the repository is not a license on everything the repository reads.
