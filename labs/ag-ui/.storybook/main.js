// Storybook 10 for the Harbor lab: React + Vite, CSF 3, JS only.
//
// Verified against storybook@10.6.1 and @storybook/react-vite@10.6.1:
//   - `framework: '@storybook/react-vite'`, `stories`, `addons`, `core`,
//     `features` and `viteFinal` are StorybookConfig fields
//     (node_modules/storybook/dist/chunk-*.d.ts, StorybookConfigRaw).
//   - An addon entry whose file is named `preset.*` is loaded as a preset,
//     resolved relative to this directory (resolveAddonName in
//     node_modules/storybook/dist/_node-chunks/chunk-A5M3SXLF.js). That is how
//     src/storybook/preset.js gets its `experimental_serverChannel` hook in.
//   - `features.componentsManifest` turns on /manifests/components.json; it
//     is off by default (https://storybook.js.org/docs/ai/manifests), and
//     src/storybook/manifest-to-catalog.js reads it to report drift from the
//     Harbor catalog.

/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../stories/**/*.stories.@(js|jsx)'],
  addons: ['../src/storybook/preset.js'],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  features: { componentsManifest: true },
  async viteFinal(viteConfig) {
    // @storybook/react-vite adds docgen but not @vitejs/plugin-react
    // (node_modules/@storybook/react-vite/dist/preset.js), so JSX would be
    // compiled with Vite's defaults. Add the React plugin unless a project
    // vite.config already did.
    const flat = (viteConfig.plugins ?? []).flat(Infinity);
    const hasReact = flat.some((p) => p && typeof p === 'object' && 'name' in p && String(p.name).startsWith('vite:react'));
    if (!hasReact) {
      const { default: react } = await import('@vitejs/plugin-react');
      viteConfig.plugins = [...(viteConfig.plugins ?? []), react()];
    }
    // The preview chunk carries React, the AG-UI client and Storybook's
    // runtime; for a local tool that size is expected, not a warning.
    viteConfig.build = { ...viteConfig.build, chunkSizeWarningLimit: 1600 };
    return viteConfig;
  },
};

export default config;
