import { readFileSync } from 'node:fs';
// WCAG AA contrast check for the data (maturity) token pairs.
const PAIRS = {
  light: [
    ['mat-0', '#F4F4F5', '#52525B'],
    ['mat-1', '#E2EAF2', '#3F5C77'],
    ['mat-2', '#CBDCEB', '#29465F'],
    ['mat-3', '#AECCE5', '#122C42'],
  ],
  dark: [
    ['mat-0', '#1E1E20', '#A1A1AA'],
    ['mat-1', '#1F2C39', '#9FB9D0'],
    ['mat-2', '#27394C', '#BBD2E6'],
    ['mat-3', '#32485E', '#D8E7F5'],
  ],
};
const srgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = h => { const [r, g, b] = srgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let fail = 0;
for (const mode of ['light', 'dark']) {
  console.log(`\n${mode.toUpperCase()}`);
  for (const [name, bg, ink] of PAIRS[mode]) {
    const r = ratio(bg, ink);
    const ok = r >= 4.5;
    if (!ok) fail++;
    console.log(`  ${name}  bg ${bg}  ink ${ink}  ${r.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'}`);
  }
  const ls = PAIRS[mode].map(([, bg]) => lum(bg));
  const mono = mode === 'light'
    ? ls.every((v, i) => i === 0 || v < ls[i - 1])
    : ls.every((v, i) => i === 0 || v > ls[i - 1]);
  console.log(`  bg lightness monotonic mat-0→3: ${mono ? 'YES' : 'NO'} [${ls.map(v => v.toFixed(4)).join(', ')}]`);
}
console.log(fail ? `\n${fail} pair(s) below 4.5:1` : '\nAll 8 pairs pass AA 4.5:1');

/* Non-text: --control-line is the border on the four controls on the site (search
   input, maturity select, snippet copy button, theme toggle) and has to clear
   1.4.11's 3:1 against every ground one of them sits on. --bg-sunk is in the list
   because the copy button's ground is the snippet's. */
const GROUNDS = {
  light: { 'control-line': '#8A8A8A', bg: '#FFFFFF', 'bg-raise': '#FFFFFF', 'bg-sunk': '#F5F5F5' },
  dark: { 'control-line': '#6B6B6B', bg: '#111111', 'bg-raise': '#191919', 'bg-sunk': '#0A0A0A' },
};
let nonTextFail = 0;
console.log('\nNON-TEXT (1.4.11, 3:1) — --control-line');
for (const mode of ['light', 'dark']) {
  const g = GROUNDS[mode];
  for (const key of ['bg', 'bg-raise', 'bg-sunk']) {
    const r = ratio(g['control-line'], g[key]);
    const ok = r >= 3;
    if (!ok) nonTextFail++;
    console.log(`  ${mode}  ${g['control-line']} on --${key} ${g[key]}  ${r.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'}`);
  }
}
console.log(nonTextFail ? `${nonTextFail} control-line pair(s) below 3:1` : 'All 6 control-line pairs pass 3:1');
/* The values above are literals, like the --mat-* pairs; this reads the token back
   out of the template so the two cannot drift apart unnoticed. */
const tpl = readFileSync(new URL('../dashboard/template.html', import.meta.url), 'utf8');
const declared = `--control-line: light-dark(${GROUNDS.light['control-line']}, ${GROUNDS.dark['control-line']});`;
const inSync = tpl.includes(declared);
console.log(`  token in dashboard/template.html matches: ${inSync ? 'YES' : 'NO — ' + declared + ' not found'}`);
if (fail || nonTextFail || !inSync) process.exitCode = 1;
