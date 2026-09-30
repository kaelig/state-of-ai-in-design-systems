// Reads Storybook's components manifest and compares it with the Harbor
// catalog. The two describe the same components from opposite ends: the
// catalog is what the AG-UI agent is constrained by, the manifest is what
// Storybook's MCP server tells coding agents (it is the data behind
// `docs-list` / `docs-show`). When they disagree, one of the two kinds of
// agent is being told something false about Harbor.
//
// Manifest format, as verified: `{ v, components: { [id]: { id, name, path,
// description?, jsDocTags, reactDocgen?: { exportName, props: { [name]: {
// required, defaultValue?: { value, computed }, tsType?, type?, description? }
// } }, stories: [{ id, name, snippet?, warning? }], import? } }, meta }`.
// Sources: https://storybook.js.org/docs/ai/manifests (field list, and "this
// manifest schema is not yet stable"), the research notes in
// research_notes/AG UI protocol for design systems/storybook_generation.md
// section 1, and this lab's own `storybook build` output at
// storybook-static/manifests/components.json (storybook@10.6.1, v 0, docgen
// "react-docgen"). The manifest is only written when main.js sets
// `features.componentsManifest: true`.
//
// Run: node src/storybook/manifest-to-catalog.js [file-or-url]
//   defaults to storybook-static/manifests/components.json

import { readFile } from 'node:fs/promises';
import { harbor } from '../catalog/index.js';

/** Props every Harbor React component takes for plumbing, not part of the contract. */
const PLUMBING = new Set(['className', 'children', 'onClick', 'style']);

/**
 * @typedef {{ required?: boolean, defaultValue?: { value: string, computed?: boolean }, tsType?: any, type?: any, flowType?: any, description?: string }} DocgenProp
 * @typedef {{ id: string, name: string, path?: string, reactDocgen?: { exportName?: string, displayName?: string, props?: Record<string, DocgenProp> }, stories?: { id: string, name: string, snippet?: string, warning?: string }[] }} ManifestComponent
 * @typedef {{ v?: number, components: Record<string, ManifestComponent>, meta?: any }} ComponentsManifest
 */

/**
 * The manifest, reshaped as a partial catalog: one entry per component, with
 * the props react-docgen found expressed the way the catalog expresses them.
 * @param {ComponentsManifest} manifest
 */
export function manifestToCatalog(manifest) {
  if (!manifest || typeof manifest.components !== 'object') throw new Error('Not a Storybook components manifest: no `components` object.');
  /** @type {Record<string, { manifestId: string, stories: number, incompleteSnippets: number, props: Record<string, { default?: unknown, required?: boolean, typed: boolean }> }>} */
  const components = {};
  for (const entry of Object.values(manifest.components)) {
    const name = entry.reactDocgen?.exportName ?? entry.reactDocgen?.displayName ?? entry.name;
    /** @type {Record<string, { default?: unknown, required?: boolean, typed: boolean }>} */
    const props = {};
    for (const [prop, info] of Object.entries(entry.reactDocgen?.props ?? {})) {
      const typed = Boolean(info.tsType || info.type || info.flowType);
      props[prop] = { typed, ...(typed ? { required: Boolean(info.required) } : {}) };
      if (info.defaultValue && !info.defaultValue.computed) props[prop].default = parseLiteral(info.defaultValue.value);
    }
    const stories = entry.stories ?? [];
    components[name] = { manifestId: entry.id, stories: stories.length, incompleteSnippets: stories.filter((s) => s.warning).length, props };
  }
  return { version: manifest.v, docgen: manifest.meta?.docgen, components };
}

/**
 * Where the manifest and the catalog disagree.
 * @param {ComponentsManifest} manifest
 * @param {import('../catalog/index.js').Catalog} [catalog]
 */
export function compareManifest(manifest, catalog = harbor) {
  const fromManifest = manifestToCatalog(manifest);
  const catalogTypes = Object.keys(catalog.components);
  const manifestTypes = Object.keys(fromManifest.components);

  const components = catalogTypes
    .filter((type) => fromManifest.components[type])
    .map((type) => {
      const contract = catalog.components[type].props ?? {};
      const cProps = contract.properties ?? {};
      const required = new Set(contract.required ?? []);
      const m = fromManifest.components[type];
      const invisible = Object.keys(cProps).filter((p) => !m.props[p]);
      const extra = Object.keys(m.props).filter((p) => !cProps[p] && !PLUMBING.has(p));
      const defaults = Object.keys(cProps)
        .filter((p) => m.props[p] && 'default' in m.props[p] && cProps[p].default !== undefined && m.props[p].default !== cProps[p].default)
        .map((p) => ({ prop: p, catalog: cProps[p].default, manifest: m.props[p].default }));
      // Without type information react-docgen marks every prop optional, so a
      // required mismatch is only reported when the manifest actually knows.
      const requiredMismatch = Object.keys(cProps)
        .filter((p) => m.props[p]?.typed && m.props[p].required !== required.has(p))
        .map((p) => ({ prop: p, catalog: required.has(p), manifest: Boolean(m.props[p].required) }));
      return { type, manifestId: m.manifestId, stories: m.stories, incompleteSnippets: m.incompleteSnippets, invisible, extra, defaults, requiredMismatch };
    });

  const missing = catalogTypes.filter((t) => !fromManifest.components[t]);
  const unknown = manifestTypes.filter((t) => !catalog.components[t]);
  const drift = missing.length + unknown.length + components.reduce((n, c) => n + c.extra.length + c.defaults.length + c.requiredMismatch.length, 0);
  return {
    catalog: `${catalog.name}@${catalog.version}`,
    manifest: { version: fromManifest.version, docgen: fromManifest.docgen, components: manifestTypes.length },
    // Drift is disagreement. Invisible props (the catalog knows them, the
    // manifest does not) are reported separately: they mean the manifest is
    // thinner than the contract, not that it contradicts it.
    inSync: drift === 0,
    missing,
    unknown,
    components,
  };
}

/**
 * A short plain-text report, one line per finding.
 * @param {ReturnType<typeof compareManifest>} report
 */
export function formatDrift(report) {
  const lines = [`${report.catalog} vs components manifest (v${report.manifest.version}, ${report.manifest.docgen ?? 'unknown docgen'}, ${report.manifest.components} components)`];
  for (const t of report.missing) lines.push(`  missing   ${t}: in the catalog, but no story declares it as its component`);
  for (const t of report.unknown) lines.push(`  unknown   ${t}: in the manifest, not in the catalog`);
  for (const c of report.components) {
    for (const d of c.defaults) lines.push(`  default   ${c.type}.${d.prop}: catalog ${JSON.stringify(d.catalog)}, component ${JSON.stringify(d.manifest)}`);
    for (const r of c.requiredMismatch) lines.push(`  required  ${c.type}.${r.prop}: catalog ${r.catalog}, manifest ${r.manifest}`);
    for (const p of c.extra) lines.push(`  extra     ${c.type}.${p}: the component takes it, the catalog does not`);
    if (c.invisible.length) lines.push(`  invisible ${c.type}: ${c.invisible.join(', ')} (react-docgen found no type or default)`);
    if (c.incompleteSnippets) lines.push(`  snippets  ${c.type}: ${c.incompleteSnippets} of ${c.stories} story snippets marked incomplete`);
  }
  lines.push(report.inSync ? 'No drift: every prop the manifest reports agrees with the catalog.' : 'Drift found.');
  return lines.join('\n');
}

/** Parse the JavaScript source react-docgen records for a default value. */
function parseLiteral(/** @type {string} */ src) {
  const s = src.trim();
  if (/^(['"`]).*\1$/s.test(s)) return s.slice(1, -1);
  if (s === 'true' || s === 'false') return s === 'true';
  if (s === 'null') return null;
  if (s === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** @param {string} source a file path or an http(s) URL */
export async function loadManifest(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`${source} answered ${res.status}. Is features.componentsManifest on?`);
    return /** @type {ComponentsManifest} */ (await res.json());
  }
  return /** @type {ComponentsManifest} */ (JSON.parse(await readFile(source, 'utf8')));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2] ?? 'storybook-static/manifests/components.json';
  const report = compareManifest(await loadManifest(source));
  console.log(formatDrift(report));
  process.exitCode = report.inSync ? 0 : 1;
}
