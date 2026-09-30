// Builds the playground as one self-contained HTML file: every script and
// stylesheet inlined, no chunks, no assets folder. That is what a claude.ai
// Artifact (or an email attachment, or a file:// double-click) needs.
//
//   npx vite playground            dev server
//   npx vite build playground      writes playground/dist/index.html

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  plugins: [react(), precompiledAjv(), singleFile()],
  server: {
    // The playground imports the lab's src/ from one level up.
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    // No preload helper: with code splitting off every import is already inline.
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4096,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        // src/figma/tree-to-figma.js ships its Figma runtime as the source text
        // of a function (Function.prototype.toString), and Figma's plugin
        // sandbox rejects optional catch bindings, ?. , ?? and object spread.
        // The default compressor rewrites `catch (e) {}` to `catch {}`, so keep
        // it from introducing anything newer than ES2017.
        minify: { compress: { target: 'es2017' }, mangle: true, codegen: true },
      },
    },
  },
});

/**
 * Inline the built JS and CSS into index.html and drop the files. About thirty
 * lines instead of a dependency: find each <script src> and <link href> that
 * points at a bundle chunk or asset, swap in its contents, delete it.
 * @returns {import('vite').Plugin}
 */
function singleFile() {
  return {
    name: 'playground-single-file',
    enforce: 'post',
    apply: 'build',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      const inlined = new Set();
      const find = (/** @type {string} */ ref) => {
        const name = ref.replace(/^\.?\//, '');
        return bundle[name] ? name : undefined;
      };

      source = source.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
        const name = find(src);
        const chunk = name ? bundle[name] : undefined;
        if (!name || !chunk || chunk.type !== 'chunk') return tag;
        inlined.add(name);
        // Keep the HTML parser from ending the script early.
        const code = chunk.code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
        return `<script type="module">${code}</script>`;
      });
      source = source.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, (tag, href) => {
        const name = find(href);
        const asset = name ? bundle[name] : undefined;
        if (!name || !asset || asset.type !== 'asset') return tag;
        inlined.add(name);
        return `<style>${String(asset.source).replace(/<\/style/gi, '<\\/style')}</style>`;
      });
      // Preload hints for files that no longer exist.
      source = source.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>\s*/g, '');

      // Scripts go last in <body> so the <title> stays near the top of the file.
      const scripts = [];
      source = source.replace(/<script type="module">[\s\S]*?<\/script>\s*/g, (s) => {
        scripts.push(s.trim());
        return '';
      });
      // A function replacement, so `$&`-style sequences in the code stay literal.
      source = source.replace('</body>', () => `${scripts.join('\n')}\n</body>`);

      html.source = source;
      for (const name of inlined) delete bundle[name];
    },
  };
}

/**
 * Ajv compiles each schema with `new Function`, which a page served under a
 * Content-Security-Policy without 'unsafe-eval' refuses; every contract check
 * then fails. For the build, swap the `ajv` import in src/tree/tree.js for
 * validators generated ahead of time from harbor.catalog.json with Ajv's
 * standalone mode: the same Ajv, the same options, no eval at runtime. The
 * dev server keeps real Ajv.
 * @returns {import('vite').Plugin}
 */
function precompiledAjv() {
  const SHIM = '\0playground-precompiled-ajv';
  const catalogFile = fileURLToPath(new URL('../src/catalog/harbor.catalog.json', import.meta.url));
  return {
    name: 'playground-precompiled-ajv',
    enforce: 'pre',
    apply: 'build',
    resolveId(id, importer) {
      if (id === 'ajv' && importer && !importer.includes('node_modules')) return SHIM;
      return null;
    },
    load(id) {
      if (id !== SHIM) return null;
      this.addWatchFile(catalogFile);
      const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
      // Keep these options in step with the `new Ajv(...)` in src/tree/tree.js.
      const ajv = new Ajv({ allErrors: true, strict: false, code: { source: true, esm: true } });
      /** @type {Record<string, string>} */
      const refs = {};
      /** @type {[string, string][]} */
      const keys = [];
      for (const [type, contract] of Object.entries(catalog.components)) {
        const name = `validate_${type.replace(/\W/g, '_')}`;
        ajv.addSchema(structuredClone(contract.props), `harbor:${type}`);
        refs[name] = `harbor:${type}`;
        keys.push([JSON.stringify(contract.props), name]);
      }
      let code = standaloneCode(ajv, refs).replace(/^"use strict";/, '');
      // Standalone output still require()s Ajv's small runtime helpers; hoist them to imports.
      /** @type {string[]} */
      const imports = [];
      code = code.replace(/require\("([^"]+)"\)/g, (_m, spec) => {
        const local = `__ajvRuntime${imports.length}`;
        imports.push(`import * as ${local} from ${JSON.stringify(spec)};`);
        return local;
      });
      return `${imports.join('\n')}
${code}
const byKey = new Map([${keys.map(([k, n]) => `[${JSON.stringify(k)}, ${n}]`).join(', ')}]);
export default class PrecompiledAjv {
  compile(schema) {
    const validate = byKey.get(JSON.stringify(schema));
    if (!validate) throw new Error('This build only carries validators precompiled from harbor.catalog.json. Rebuild the playground after changing the catalog.');
    return validate;
  }
}
`;
    },
  };
}
