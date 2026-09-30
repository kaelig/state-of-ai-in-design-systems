// Every story renders inside <HarborTheme>, driven by two toolbar globals:
// color mode and density. They are the same two theme axes the agent can set
// through shared state, and the generator story keeps the toolbar and the
// agent's state in step.
//
// Verified against storybook@10.6.1: `globalTypes` with `toolbar: { title,
// icon, items, dynamicTitle }` and `initialGlobals` are Preview fields
// (node_modules/storybook/dist/chunk-DdLFxT9J.d.ts, ProjectAnnotations and
// NormalizedToolbarConfig; icon names from the same file's icon map), per
// https://storybook.js.org/docs/essentials/toolbars-and-globals.

import { HarborTheme } from '../src/react/index.js';
import './preview.css';

/** @type {import('@storybook/react-vite').Preview} */
const preview = {
  globalTypes: {
    harborMode: {
      description: 'Harbor color mode',
      toolbar: {
        title: 'Mode',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    harborDensity: {
      description: 'Harbor spacing density',
      toolbar: {
        title: 'Density',
        icon: 'grow',
        items: [
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'compact', title: 'Compact' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { harborMode: 'light', harborDensity: 'comfortable' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
  },
  decorators: [
    (Story, context) => {
      // The generator draws its own chrome and themes only its canvas.
      if (context.parameters.harbor?.decorator === false) return <Story />;
      const { harborMode = 'light', harborDensity = 'comfortable' } = context.globals;
      return (
        <HarborTheme mode={harborMode} density={harborDensity} className="sb-harbor-root" style={{ padding: 'var(--harbor-space-xl)' }}>
          <Story />
        </HarborTheme>
      );
    },
  ],
};

export default preview;
