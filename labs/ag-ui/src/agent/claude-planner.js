// A planner backed by Claude. It swaps in for the keyword recipes when
// ANTHROPIC_API_KEY is set (see src/server/index.js), and nothing downstream
// changes: the agent still streams AG-UI events, validates against the catalog
// and asks for review.
//
// The model sees the catalog two ways: the compact signatures from
// catalogToContext in the system prompt, and the full JSON Schema as the
// input_schema of a `render_ui` tool. Its tool input streams as it is written
// (eager_input_streaming), and each partial tree goes to `onPartial`, which the
// agent turns into STATE_DELTA patches, so the screen assembles on the canvas
// while the model is still deciding what comes next.
//
// API notes, from the Claude API reference bundled with Claude Code:
// - claude-opus-5-5 rejects a forced tool_choice (`any` / `tool`) with a 400,
//   so the request uses `auto` and the system prompt names the tool.
// - Strict tool use is off: the tree schema uses a keyed map
//   (additionalProperties as a schema) and oneOf, which strict mode does not
//   take. Validation happens here instead, with the catalog's own validator,
//   and failures go back to the model as an error tool_result.
// - With eager input streaming the API does not validate or coerce the input,
//   and the SDK parses it tolerantly, so a truncated or malformed input can
//   look like a valid partial object. stop_reason is checked before the input
//   is trusted, and the parse is re-checked against the schema.
// - `fallbacks: "default"` (beta server-side-fallback-2026-07-01) re-runs a
//   request that the model's safeguards decline on a fallback model chosen by
//   refusal category, instead of returning the refusal.

import Anthropic from '@anthropic-ai/sdk';
import untruncateModule from 'untruncate-json';
import { catalogId, catalogToContext, treeSchema } from '../catalog/index.js';
import { validateTree } from '../tree/tree.js';

// untruncate-json ships CommonJS with an __esModule default; Node's ESM loader
// hands back the module object, bundlers hand back the function.
const untruncateJson = /** @type {(json: string) => string} */ (/** @type {any} */ (untruncateModule).default ?? untruncateModule);

const MODEL = 'claude-opus-5-5';
const MAX_ROUNDS = 3;

/**
 * @param {{
 *   client?: any,
 *   model?: string,
 *   effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max',
 *   partialEveryMs?: number,
 * }} [options]
 * @returns {import('./design-agent.js').Planner & { streams: true }}
 */
export function claudePlanner({ client, model = MODEL, effort = 'medium', partialEveryMs = 80 } = {}) {
  const api = client ?? new Anthropic();

  /** @type {any} */
  const planner = async (/** @type {any} */ { prompt, state, catalog, onPartial }) => {
    const system = systemPrompt(catalog, state);
    const tool = {
      name: 'render_ui',
      description: `Render one screen using only ${catalog.name} components. Send the complete tree in one call.`,
      input_schema: treeSchema(catalog),
      eager_input_streaming: true,
    };
    /** @type {any[]} */
    const messages = [{ role: 'user', content: prompt }];

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const stream = api.beta.messages.stream({
        model,
        max_tokens: 64000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: [tool],
        tool_choice: { type: 'auto' },
        messages,
      });

      let json = '';
      let last = 0;
      /** @type {any} */
      let message;
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
            json += event.delta.partial_json;
            const now = Date.now();
            if (onPartial && now - last >= partialEveryMs) {
              last = now;
              const partial = parsePartial(json);
              if (partial) onPartial(partial);
            }
          }
        }
        message = await stream.finalMessage();
      } catch (error) {
        // Only the SDK's JSON failure is retried; API errors (auth, rate
        // limits, overload) propagate so they are not mistaken for bad output.
        if (error instanceof Anthropic.APIError) throw error;
        if (round === MAX_ROUNDS) throw error;
        continue;
      }

      if (message.stop_reason === 'refusal') {
        throw new Error(`The model declined this request${message.stop_details?.category ? ` (${message.stop_details.category})` : ''}.`);
      }
      const call = message.content.find((/** @type {any} */ b) => b.type === 'tool_use' && b.name === 'render_ui');
      if (!call) {
        const text = message.content.find((/** @type {any} */ b) => b.type === 'text')?.text;
        throw new Error(`The model answered without calling render_ui${text ? `: ${text.slice(0, 200)}` : '.'}`);
      }
      if (message.stop_reason === 'max_tokens') throw new Error('The model ran out of output tokens mid-screen.');

      const tree = call.input;
      const report = validateTree(tree, catalog);
      if (report.valid) {
        return { tree, recipe: `${model} design`, note: round > 1 ? `It took ${round} tries to satisfy the catalog.` : undefined };
      }
      // Hand the errors back in the model's own loop: the assistant turn as it
      // was, then an error result naming each path and allowed value.
      messages.push({ role: 'assistant', content: message.content });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: call.id,
            is_error: true,
            content: JSON.stringify({ errors: report.errors.map((e) => ({ path: e.path, message: e.message })) }),
          },
        ],
      });
    }
    throw new Error(`The model could not produce a tree that passes ${catalogId(catalog)}.`);
  };
  planner.streams = /** @type {const} */ (true);
  return planner;
}

/**
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {any} state
 */
function systemPrompt(catalog, state) {
  const [ctx] = catalogToContext(catalog);
  const current = state?.ui?.root ? `\n\nThe screen currently on the canvas, which the user may be asking you to change:\n${JSON.stringify(state.ui)}` : '';
  return `You design product screens for designers and developers who are prototyping with the ${catalog.name} design system.

Answer every request by calling render_ui once with the complete screen. Use only these components and only the props listed; every value in quotes is the full set that prop allows:

${ctx.value}

Tree rules: nodes is a flat map keyed by short ids ("n1", "n2", ...); only components marked [children] may list children; the root is usually a Stack or a Card. Write realistic, specific copy for the product the user describes, not placeholder text. One level 1 heading per screen, no skipped heading levels, and at most one primary button in any group.${current}`;
}

/**
 * Parse streamed tool input that may stop mid-token, keeping only what a
 * renderer can draw: nodes whose type is a whole component name so far.
 * @param {string} json
 */
export function parsePartial(json) {
  let value;
  try {
    value = JSON.parse(untruncateJson(json));
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || typeof value.nodes !== 'object' || !value.nodes) return null;
  /** @type {Record<string, any>} */
  const nodes = {};
  for (const [id, node] of Object.entries(value.nodes)) {
    if (node && typeof node === 'object' && typeof node.type === 'string' && node.props && typeof node.props === 'object') {
      nodes[id] = { type: node.type, props: node.props, ...(Array.isArray(node.children) ? { children: node.children } : {}) };
    }
  }
  return { title: typeof value.title === 'string' ? value.title : '', root: typeof value.root === 'string' && nodes[value.root] ? value.root : null, nodes };
}
