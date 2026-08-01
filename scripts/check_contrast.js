import { readFileSync } from 'node:fs';
// WCAG AA contrast check for the data (maturity) token pairs.
const PAIRS = {
  light: [
    ['mat-0', 'oklch(96.7% 0.001 286.4)', 'oklch(44.2% 0.015 285.8)'],
    ['mat-1', 'oklch(93.3% 0.014 248)', 'oklch(46.3% 0.056 247.4)'],
    ['mat-2', 'oklch(88.6% 0.028 244.7)', 'oklch(38.3% 0.055 245.9)'],
    ['mat-3', 'oklch(83.1% 0.048 243.5)', 'oklch(28.4% 0.052 246.5)'],
  ],
  dark: [
    ['mat-0', 'oklch(23.6% 0.004 286.1)', 'oklch(71.2% 0.013 286.1)'],
    ['mat-1', 'oklch(28.7% 0.03 248.9)', 'oklch(77.4% 0.044 245.1)'],
    ['mat-2', 'oklch(33.8% 0.041 250.4)', 'oklch(85.3% 0.037 244.5)'],
    ['mat-3', 'oklch(39.3% 0.047 249.1)', 'oklch(92.1% 0.025 246.2)'],
  ],
};
/* The tokens are authored in oklch, so the check reads them in the space the
   stylesheet declares them in. It converts down to the 8-bit sRGB the browser
   actually paints before measuring: WCAG luminance is defined on those channels,
   and quantizing here is what keeps every ratio identical to the hex era, so a
   change to this file shows up as a changed number rather than as rounding. */
const srgb = (c) => {
  const [L, C, H] = c.match(/[\d.]+/g).map(Number);
  const hr = (H * Math.PI) / 180;
  const [a, b] = [C * Math.cos(hr), C * Math.sin(hr)];
  const l = (L / 100 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L / 100 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L / 100 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => {
    const g = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255) / 255;
  });
};
const lin = (c) =>
  c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const lum = (h) => {
  const [r, g, b] = srgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

let fail = 0;
for (const mode of ['light', 'dark']) {
  console.log(`\n${mode.toUpperCase()}`);
  for (const [name, bg, ink] of PAIRS[mode]) {
    const r = ratio(bg, ink);
    const ok = r >= 4.5;
    if (!ok) fail++;
    console.log(
      `  ${name}  bg ${bg}  ink ${ink}  ${r.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'}`,
    );
  }
  const ls = PAIRS[mode].map(([, bg]) => lum(bg));
  const mono =
    mode === 'light'
      ? ls.every((v, i) => i === 0 || v < ls[i - 1])
      : ls.every((v, i) => i === 0 || v > ls[i - 1]);
  console.log(
    `  bg lightness monotonic mat-0→3: ${mono ? 'YES' : 'NO'} [${ls.map((v) => v.toFixed(4)).join(', ')}]`,
  );
}
console.log(
  fail ? `\n${fail} pair(s) below 4.5:1` : '\nAll 8 pairs pass AA 4.5:1',
);

/* Non-text: --control-line is the border on the four controls on the site (search
   input, maturity select, snippet copy button, theme toggle) and has to clear
   1.4.11's 3:1 against every ground one of them sits on. --bg-sunk is in the list
   because the copy button's ground is the snippet's. */
const GROUNDS = {
  light: {
    'control-line': 'oklch(63.3% 0 0)',
    bg: 'oklch(100% 0 0)',
    'bg-raise': 'oklch(100% 0 0)',
    'bg-sunk': 'oklch(97% 0 0)',
  },
  dark: {
    'control-line': 'oklch(52.8% 0 0)',
    bg: 'oklch(17.8% 0 0)',
    'bg-raise': 'oklch(21.3% 0 0)',
    'bg-sunk': 'oklch(14.5% 0 0)',
  },
};
let nonTextFail = 0;
console.log('\nNON-TEXT (1.4.11, 3:1) — --control-line');
for (const mode of ['light', 'dark']) {
  const g = GROUNDS[mode];
  for (const key of ['bg', 'bg-raise', 'bg-sunk']) {
    const r = ratio(g['control-line'], g[key]);
    const ok = r >= 3;
    if (!ok) nonTextFail++;
    console.log(
      `  ${mode}  ${g['control-line']} on --${key} ${g[key]}  ${r.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'}`,
    );
  }
}
console.log(
  nonTextFail
    ? `${nonTextFail} control-line pair(s) below 3:1`
    : 'All 6 control-line pairs pass 3:1',
);
/* The values above are literals, like the --mat-* pairs; this reads the token back
   out of the template so the two cannot drift apart unnoticed. */
const tpl = readFileSync(
  new URL('../dashboard/template.html', import.meta.url),
  'utf8',
);
const declared = `--control-line: light-dark(${GROUNDS.light['control-line']}, ${GROUNDS.dark['control-line']});`;
const inSync = tpl.includes(declared);
console.log(
  `  token in dashboard/template.html matches: ${inSync ? 'YES' : 'NO — ' + declared + ' not found'}`,
);
if (fail || nonTextFail || !inSync) process.exitCode = 1;
