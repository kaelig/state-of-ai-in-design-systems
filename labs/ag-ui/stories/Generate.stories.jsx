// AG-UI/Generate: describe a screen, watch the design agent build it from
// Harbor components over AG-UI, review it, and on approval let the agent save
// it as a story in this Storybook through the `save_story` frontend tool.
//
// The story's args are the generator's inputs, so a URL can start a run:
//   iframe.html?id=ag-ui-generate--generate&args=prompt:a+sign+up+form;autoRun:!true
//
// Storybook API used (verified at storybook@10.6.1): `useArgs` and
// `useGlobals` from `storybook/preview-api` (dist/preview-api/index.d.ts; the
// render-function pattern is the one in
// https://storybook.js.org/docs/writing-stories/args#setting-args-from-within-a-story),
// and the `!manifest` tag, which keeps this tool out of the components manifest
// (https://storybook.js.org/docs/ai/manifests).

import { useArgs, useGlobals } from 'storybook/preview-api';
import { Generator } from '../src/storybook/Generator.jsx';
import { DEFAULT_AGENT_URL, MODES, TRANSPORTS } from '../src/storybook/generator-options.js';

export default {
  title: 'AG-UI/Generate',
  tags: ['!manifest', 'agui'],
  parameters: {
    layout: 'fullscreen',
    // The generator draws its own chrome; only its canvas is Harbor.
    harbor: { decorator: false },
  },
  argTypes: {
    prompt: { control: 'text', description: 'The screen to ask for. Editing it here and pressing Generate in the story are the same thing.' },
    mode: {
      options: MODES.map((m) => m.value),
      control: { type: 'select', labels: Object.fromEntries(MODES.map((m) => [m.value, m.label])) },
      description: 'Which AG-UI mechanism carries the screen: shared state, a frontend tool call, an activity message, or an A2UI surface.',
    },
    transport: {
      options: TRANSPORTS.map((t) => t.value),
      control: { type: 'inline-radio', labels: Object.fromEntries(TRANSPORTS.map((t) => [t.value, t.label])) },
      description: 'Run the agent in this tab, or POST to the agent server started with `npm run agent`.',
    },
    plantMistake: { control: 'boolean', description: 'Make the agent emit one prop Harbor does not allow, to show validation and repair.' },
    autoRun: { control: 'boolean', description: 'Generate as soon as the story renders, with the prompt above.' },
    delayMs: { control: { type: 'range', min: 0, max: 200, step: 5 }, description: 'Pause between streamed nodes, in milliseconds.' },
    agentUrl: { control: 'text', description: 'Where the HttpAgent transport POSTs RunAgentInput.' },
  },
  args: {
    prompt: 'a sign up form',
    mode: 'state',
    transport: 'browser',
    plantMistake: false,
    autoRun: false,
    delayMs: 45,
    agentUrl: DEFAULT_AGENT_URL,
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    const [globals, updateGlobals] = useGlobals();
    return (
      <Generator
        {...args}
        theme={{ mode: globals.harborMode, density: globals.harborDensity }}
        onArgsChange={updateArgs}
        onThemeChange={updateGlobals}
      />
    );
  },
};

export const Generate = {};

/** Tool-call delivery with a planted contract error: the client rejects it, the agent repairs it. */
export const RepairLoop = {
  args: { prompt: 'a dashboard with 4 metrics', mode: 'tool', plantMistake: true },
};
