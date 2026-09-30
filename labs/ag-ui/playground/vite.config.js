// Builds the playground as one self-contained HTML file: every script and
// stylesheet inlined, no chunks, no assets folder. That is what a claude.ai
// Artifact (or an email attachment, or a file:// double-click) needs.
//
//   npx vite playground            dev server
//   npx vite build playground      writes playground/dist/index.html

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  plugins: [react(), singleFile()],
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
      output: { codeSplitting: false },
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
