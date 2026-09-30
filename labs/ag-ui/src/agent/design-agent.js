// An AG-UI agent whose only output vocabulary is the Harbor catalog. It is an
// AbstractAgent, so the same class runs in a browser tab, inside Storybook, or
// behind the SSE server in src/server; every client subscribes to it the same
// way it would subscribe to an HttpAgent.
//
// Three delivery modes, one per AG-UI mechanism a design system could ride on:
//
//   state     STATE_SNAPSHOT, then one STATE_DELTA (JSON Patch) per node. The
//             tree lives in shared state, so any number of surfaces (React,
//             Figma, Storybook) render the same document.
//   tool      A `render_ui` frontend tool call whose arguments stream as JSON.
//             The client holds the components, validates, and answers with a
//             tool result; errors go back to the agent to repair.
//   activity  ACTIVITY_SNAPSHOT / ACTIVITY_DELTA: the screen is an activity
//             message in the conversation, the way chat UIs show generative UI.
//   a2ui      The same activity mechanism carrying A2UI v0.9 operations
//             (activityType "a2ui-surface"), the shape @ag-ui/a2ui-middleware
//             emits, so any A2UI client with the Harbor catalog can render it.
//
// After a screen is built the run ends with an interrupt asking for design
// review. Approving it resumes the thread, and the agent then calls whichever
// export tools the client offered: `save_story` in Storybook, `draw_in_figma`
// in the Figma plugin. The agent never knows which surface it is talking to.

import { AbstractAgent, EventType, PROTOCOL_VERSION } from '@ag-ui/client';
import jsonpatch from 'fast-json-patch';
import { Observable } from 'rxjs';
import { A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY, a2uiCatalogId, treeToA2uiOperations } from '../a2ui/index.js';
import { catalogId, harbor } from '../catalog/index.js';
import { applyOps, emptyTree, summarize, treeToOps, validateTree } from '../tree/tree.js';
import { RECIPES, injectMistake, plan, repair, themeIntent } from './recipes.js';

/**
 * @typedef {import('@ag-ui/core').RunAgentInput} RunAgentInput
 * @typedef {import('@ag-ui/core').BaseEvent} BaseEvent
 * @typedef {import('../tree/tree.js').UITree} UITree
 * @typedef {'state' | 'tool' | 'activity' | 'a2ui'} Mode
 * @typedef {{
 *   mode?: Mode,
 *   delayMs?: number,
 *   simulateMistake?: boolean,
 *   review?: boolean,
 * }} DesignRunOptions  Read from RunAgentInput.forwardedProps.
 * @typedef {(input: {
 *   prompt: string,
 *   state: any,
 *   catalog: import('../catalog/index.js').Catalog,
 *   onPartial?: (partial: UITree) => void,
 * }) => Promise<{ tree: UITree, recipe: string, note?: string }>} Planner
 *   A planner that sets `streams = true` on itself gets `onPartial` in state
 *   mode and should call it with each partial tree as it is produced.
 */

export const REVIEW_REASON = 'design_review';
export const EXPORT_TOOLS = ['save_story', 'draw_in_figma', 'export_code'];

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
const uid = (/** @type {string} */ prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

/** "Build this in code", "use the selection": the prompt points at the screen it came with. */
const POINTS_AT_CURRENT = /\b(this|these|selection|selected|current|existing|as is)\b/i;

/**
 * The offline planner, wrapped to the Planner signature. When a surface sends
 * a screen in state (the Figma plugin's "Send selection to agent") and the
 * prompt points at it rather than asking for a new kind of screen, the screen
 * is kept as sent; the agent still validates it against the catalog, which is
 * the point of sending a Figma frame to a code agent.
 */
export const scriptedPlanner = /** @type {Planner} */ (
  async ({ prompt, state }) => {
    const sent = state?.ui;
    if (sent?.root && sent.nodes?.[sent.root] && POINTS_AT_CURRENT.test(prompt) && !RECIPES.some((r) => r.match.test(prompt))) {
      return { recipe: 'coded version of the screen you sent', tree: structuredClone(sent) };
    }
    return plan(prompt);
  }
);

export class DesignAgent extends AbstractAgent {
  /**
   * @param {import('@ag-ui/client').AgentConfig & {
   *   catalog?: import('../catalog/index.js').Catalog,
   *   planner?: Planner,
   *   defaults?: DesignRunOptions,
   * }} [config]
   */
  constructor(config = {}) {
    const { catalog = harbor, planner = scriptedPlanner, defaults = {}, ...rest } = config;
    super({ description: `Designs screens from the ${catalog.name} catalog`, ...rest });
    this.catalog = catalog;
    this.planner = planner;
    this.defaults = defaults;
  }

  /** The last tree built on each thread, for resuming activity-mode runs whose screen is not in state. */
  #memory = new Map();

  /** @returns {Promise<import('@ag-ui/core').AgentCapabilities>} */
  async getCapabilities() {
    return {
      identity: { name: 'Harbor designer', type: 'ag-ui-design-systems-lab', description: this.description, version: '0.1.0' },
      transport: { streaming: true },
      tools: { supported: true, clientProvided: true },
      state: { snapshots: true, deltas: true, persistentState: true },
      humanInTheLoop: { supported: true, approvals: true, interrupts: true },
      custom: { catalog: catalogId(this.catalog), modes: ['state', 'tool', 'activity', 'a2ui'], a2uiCatalogId: a2uiCatalogId(this.catalog), exportTools: EXPORT_TOOLS },
    };
  }

  /** @param {RunAgentInput} input */
  run(input) {
    return new Observable((subscriber) => {
      let stopped = false;
      const emit = (/** @type {Record<string, any>} */ event) => {
        if (!stopped) subscriber.next(/** @type {BaseEvent} */ ({ timestamp: Date.now(), ...event }));
      };
      this.#run(input, emit, () => stopped)
        .then(() => subscriber.complete())
        .catch((error) => {
          emit({ type: EventType.RUN_ERROR, message: String(error?.message ?? error), code: 'design_agent_error' });
          subscriber.complete();
        });
      return () => {
        stopped = true;
      };
    });
  }

  /**
   * @param {RunAgentInput} input
   * @param {(event: Record<string, any>) => void} emit
   * @param {() => boolean} stopped
   */
  async #run(input, emit, stopped) {
    /** @type {DesignRunOptions} */
    const opts = { mode: 'state', delayMs: 45, simulateMistake: false, review: true, ...this.defaults, ...(input.forwardedProps ?? {}) };
    const pace = () => (opts.delayMs ? sleep(opts.delayMs) : Promise.resolve());
    const ctx = { input, emit, pace, stopped, opts, catalog: this.catalog };

    emit({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId, protocolVersion: PROTOCOL_VERSION });

    const outcome = input.resume?.length ? await this.#onResume(ctx) : await this.#onTurn(ctx);
    if (stopped()) return;
    emit({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId, ...outcome });
  }

  /**
   * A normal turn: either a tool result came back, or the user asked for something.
   * @param {Ctx} ctx
   * @returns {Promise<Record<string, any>>} extra RUN_FINISHED fields
   */
  async #onTurn(ctx) {
    const { input } = ctx;
    const last = input.messages.at(-1);

    if (last?.role === 'tool') return this.#onToolResult(ctx, last);

    const prompt = [...input.messages].reverse().find((m) => m.role === 'user');
    const text = typeof prompt?.content === 'string' ? prompt.content : '';
    if (!text.trim()) {
      await say(ctx, `Describe a screen and I will build it from ${this.catalog.name} components.`);
      return {};
    }

    // A follow-up that only changes the theme edits state instead of redrawing.
    const theme = themeIntent(text);
    const existing = input.state?.ui?.root ?? this.#memory.get(input.threadId)?.root ?? findLastTree(input.messages)?.root;
    const onlyTheme = Object.keys(theme).length > 0 && existing && text.split(/\s+/).length <= 6;
    if (onlyTheme) {
      // Tool, activity and A2UI threads keep their screen outside shared
      // state, so they may have no /theme yet, and adding under a missing
      // parent is an invalid patch.
      const hasTheme = input.state?.theme && typeof input.state.theme === 'object';
      await step(ctx, 'theme', async () => {
        ctx.emit({
          type: EventType.STATE_DELTA,
          delta: hasTheme
            ? Object.entries(theme).map(([k, v]) => ({ op: 'add', path: `/theme/${k}`, value: v }))
            : [{ op: 'add', path: '/theme', value: { mode: 'light', density: 'comfortable', ...theme } }],
        });
      });
      await say(ctx, `Switched the theme to ${Object.values(theme).join(', ')}. The components did not change, only the tokens they resolve to.`);
      return {};
    }

    const mode = ctx.opts.mode === 'tool' && !input.tools.some((t) => t.name === 'render_ui') ? 'state' : ctx.opts.mode;

    // A planner that streams (Claude) writes the tree while it thinks. In
    // state mode each partial tree becomes a STATE_DELTA, so the canvas fills
    // in as the model writes rather than after it finishes.
    const live = /** @type {any} */ (this.planner).streams === true && mode === 'state';
    /** @type {UITree | null} */
    let streamed = null;
    if (live) {
      this.#snapshot(ctx, theme);
      streamed = emptyTree();
    }
    const onPartial = live
      ? (/** @type {UITree} */ partial) => {
          const next = knownOnly(partial, this.catalog);
          const delta = jsonpatch.compare({ ui: streamed }, { ui: next });
          if (delta.length) {
            ctx.emit({ type: EventType.STATE_DELTA, delta });
            streamed = next;
          }
        }
      : undefined;

    /** @type {Awaited<ReturnType<Planner>>} */
    let planned;
    await step(ctx, 'plan', async () => {
      planned = await this.planner({ prompt: text, state: input.state, catalog: this.catalog, onPartial });
    });
    let tree = /** @type {UITree} */ (/** @type {any} */ (planned).tree);
    await say(ctx, `Building a ${planned.recipe} from ${this.catalog.name}: ${summarize(tree)}.${planned.note ? ' ' + planned.note : ''}`);

    let mistake;
    if (ctx.opts.simulateMistake) ({ tree, mistake } = injectMistake(tree));

    if (mode !== ctx.opts.mode) await say(ctx, 'The client offered no render_ui tool, so I am streaming the screen into shared state instead.');

    if (mode === 'tool') return this.#callRenderTool(ctx, tree);
    if (mode === 'activity') return this.#streamActivity(ctx, tree, theme, mistake);
    if (mode === 'a2ui') return this.#streamA2ui(ctx, tree, theme, mistake);
    return this.#streamState(ctx, tree, theme, mistake, streamed);
  }

  /**
   * Open a screen in shared state: catalog, theme, an empty tree, and a review
   * status of drafting.
   * @param {Ctx} ctx
   * @param {Record<string, string>} theme
   */
  #snapshot(ctx, theme) {
    const prior = ctx.input.state && typeof ctx.input.state === 'object' ? ctx.input.state : {};
    ctx.emit({
      type: EventType.STATE_SNAPSHOT,
      snapshot: {
        ...prior,
        catalog: catalogId(this.catalog),
        theme: { mode: 'light', density: 'comfortable', ...(prior.theme ?? {}), ...theme },
        ui: emptyTree(),
        review: { status: 'drafting' },
      },
    });
  }

  /**
   * @param {Ctx} ctx
   * @param {UITree} tree
   * @param {Record<string, string>} theme
   * @param {string | undefined} mistake
   */
  async #streamState(ctx, tree, theme, mistake, streamed = /** @type {UITree | null} */ (null)) {
    const { emit, pace } = ctx;
    if (streamed) {
      // The planner already streamed most of it; send what is left.
      const delta = jsonpatch.compare({ ui: streamed }, { ui: tree });
      if (delta.length) emit({ type: EventType.STATE_DELTA, delta });
    } else {
      this.#snapshot(ctx, theme);
    }
    if (!streamed) {
      await step(ctx, 'layout', async () => {
        const ops = treeToOps(tree);
        // One delta per node: the node itself plus the link from its parent.
        for (let i = 0; i < ops.length; ) {
          const batch = [ops[i++]];
          while (i < ops.length && !(ops[i].op === 'add' && /^\/ui\/nodes\/[^/]+$/.test(ops[i].path))) batch.push(ops[i++]);
          if (ctx.stopped()) return;
          emit({ type: EventType.STATE_DELTA, delta: batch });
          await pace();
        }
      });
    }
    const fixed = await this.#validate(ctx, tree, mistake);
    if (fixed !== tree) {
      emit({ type: EventType.STATE_DELTA, delta: jsonpatch.compare({ ui: tree }, { ui: fixed }) });
      tree = fixed;
    }
    emit({ type: EventType.STATE_DELTA, delta: [{ op: 'replace', path: '/review', value: { status: 'in_review' } }] });
    return this.#askForReview(ctx, tree);
  }

  /**
   * @param {Ctx} ctx
   * @param {UITree} tree
   * @param {Record<string, string>} theme
   * @param {string | undefined} mistake
   */
  async #streamActivity(ctx, tree, theme, mistake) {
    const { emit, pace } = ctx;
    const messageId = uid('surface');
    const activityType = `${this.catalog.name}.surface`;
    emit({ type: EventType.ACTIVITY_SNAPSHOT, messageId, activityType, content: { catalog: catalogId(this.catalog), theme, ui: emptyTree() } });
    await step(ctx, 'layout', async () => {
      for (const op of treeToOps(tree)) {
        if (ctx.stopped()) return;
        emit({ type: EventType.ACTIVITY_DELTA, messageId, activityType, patch: [op] });
        if (op.op === 'add' && /^\/ui\/nodes\/[^/]+$/.test(op.path)) await pace();
      }
    });
    const fixed = await this.#validate(ctx, tree, mistake);
    if (fixed !== tree) {
      emit({ type: EventType.ACTIVITY_DELTA, messageId, activityType, patch: jsonpatch.compare({ ui: tree }, { ui: fixed }) });
      tree = fixed;
    }
    return this.#askForReview(ctx, tree);
  }

  /**
   * A2UI over AG-UI. Each snapshot replaces the surface with every component
   * placed so far, the way the A2UI middleware paints while a model's tool
   * arguments are still streaming.
   * @param {Ctx} ctx
   * @param {UITree} tree
   * @param {Record<string, string>} theme
   * @param {string | undefined} mistake
   */
  async #streamA2ui(ctx, tree, theme, mistake) {
    const { emit, pace } = ctx;
    const surfaceId = uid('surface');
    const messageId = `${A2UI_ACTIVITY_TYPE}-${surfaceId}`;
    const catalogUri = a2uiCatalogId(this.catalog);
    const paint = (/** @type {UITree} */ t) =>
      emit({
        type: EventType.ACTIVITY_SNAPSHOT,
        messageId,
        activityType: A2UI_ACTIVITY_TYPE,
        content: { [A2UI_OPERATIONS_KEY]: treeToA2uiOperations(t, { surfaceId, catalogId: catalogUri, theme }) },
        replace: true,
      });
    await step(ctx, 'layout', async () => {
      let partial = { ui: emptyTree() };
      const ops = treeToOps(tree);
      for (let i = 0; i < ops.length; i++) {
        if (ctx.stopped()) return;
        partial = applyOps(partial, [ops[i]]);
        const nextIsNode = i + 1 >= ops.length || (ops[i + 1].op === 'add' && /^\/ui\/nodes\/[^/]+$/.test(ops[i + 1].path));
        if (nextIsNode && partial.ui.root) {
          paint(partial.ui);
          await pace();
        }
      }
    });
    const fixed = await this.#validate(ctx, tree, mistake);
    if (fixed !== tree) {
      paint(fixed);
      tree = fixed;
    }
    return this.#askForReview(ctx, tree);
  }

  /**
   * Hand the tree to the client as a frontend tool call. Arguments stream in
   * small chunks so a client can render partial JSON as it arrives.
   * @param {Ctx} ctx
   * @param {UITree} tree
   */
  async #callRenderTool(ctx, tree) {
    const toolCallId = uid('call');
    await streamToolCall(ctx, toolCallId, 'render_ui', tree, 48);
    return { outcome: { type: 'success', pendingToolCallIds: [toolCallId] } };
  }

  /**
   * The client answered a tool call. For render_ui that answer is a validation
   * report; for an export tool it is where the thing went.
   * @param {Ctx} ctx
   * @param {import('@ag-ui/core').Message} message
   */
  async #onToolResult(ctx, message) {
    const call = findToolCall(ctx.input.messages, /** @type {any} */ (message).toolCallId);
    /** @type {any} */
    let result;
    try {
      result = JSON.parse(String(/** @type {any} */ (message).content));
    } catch {
      result = { text: String(/** @type {any} */ (message).content) };
    }
    if (call?.function.name !== 'render_ui') {
      await say(ctx, result?.message ?? `${call?.function.name ?? 'The tool'} finished.`);
      return {};
    }
    const tree = JSON.parse(call.function.arguments);
    if (result?.valid === false && result.errors?.length) {
      await say(ctx, `The client rejected ${result.errors.length} prop${result.errors.length > 1 ? 's' : ''}: ${result.errors.map((/** @type {any} */ e) => e.message).join(' ')} Fixing and sending it again.`);
      return this.#callRenderTool(ctx, repair(tree, result.errors, this.catalog));
    }
    const warnings = result?.warnings?.length ? ` ${result.warnings.length} guideline warning(s) left for review.` : '';
    await say(ctx, `Rendered ${Object.keys(tree.nodes).length} components with no contract errors.${warnings}`);
    return this.#askForReview(ctx, tree);
  }

  /**
   * Validate what was just streamed. In state and activity modes the agent
   * checks its own output against the catalog, reports it as a CUSTOM event,
   * and repairs errors before asking for review.
   * @param {Ctx} ctx
   * @param {UITree} tree
   * @param {string | undefined} mistake
   * @returns {Promise<UITree>}
   */
  async #validate(ctx, tree, mistake) {
    /** @type {UITree} */
    let out = tree;
    await step(ctx, 'validate', async () => {
      const report = validateTree(tree, this.catalog);
      ctx.emit({ type: EventType.CUSTOM, name: `${this.catalog.name}.validation`, value: report });
      if (!report.valid) {
        await say(ctx, `Caught ${report.errors.length} contract error${report.errors.length > 1 ? 's' : ''} against ${catalogId(this.catalog)}: ${report.errors.map((e) => e.message).join(' ')}${mistake ? ' (planted on purpose for the demo)' : ''} Repairing.`);
        out = repair(tree, report.errors, this.catalog);
        ctx.emit({ type: EventType.CUSTOM, name: `${this.catalog.name}.validation`, value: validateTree(out, this.catalog) });
      }
    });
    return out;
  }

  /**
   * End the run on an interrupt. The client shows the prompt and resumes the
   * thread with { approved, notes }.
   * @param {Ctx} ctx
   * @param {UITree} tree
   */
  async #askForReview(ctx, tree) {
    this.#memory.set(ctx.input.threadId, tree);
    if (!ctx.opts.review) return {};
    const exportTools = ctx.input.tools.filter((t) => EXPORT_TOOLS.includes(t.name)).map((t) => t.name);
    return {
      result: { title: tree.title, components: Object.keys(tree.nodes).length },
      outcome: {
        type: 'interrupt',
        interrupts: [
          {
            id: uid('review'),
            reason: REVIEW_REASON,
            message: exportTools.length ? `Approve "${tree.title}" and I will run ${exportTools.join(' and ')}.` : `Approve "${tree.title}"?`,
            responseSchema: {
              type: 'object',
              properties: {
                approved: { type: 'boolean' },
                notes: { type: 'string', description: 'What to change, if not approved.' },
              },
              required: ['approved'],
            },
            metadata: { tree, exportTools },
          },
        ],
      },
    };
  }

  /**
   * The thread resumes after review.
   * @param {Ctx} ctx
   */
  async #onResume(ctx) {
    const { input } = ctx;
    const entry = input.resume?.[0];
    if (entry?.status === 'cancelled') {
      await say(ctx, 'Left as a draft.');
      return {};
    }
    const answer = entry?.payload ?? {};
    if (!answer.approved) {
      const notes = String(answer.notes ?? '').trim();
      await say(ctx, notes ? `Noted: "${notes}". Send it as a new message and I will rebuild.` : 'Not approved. Tell me what to change.');
      return {};
    }
    const tree = input.state?.ui?.root ? input.state.ui : (this.#memory.get(input.threadId) ?? findLastTree(input.messages));
    if (input.state?.review) ctx.emit({ type: EventType.STATE_DELTA, delta: [{ op: 'replace', path: '/review', value: { status: 'approved' } }] });

    const offered = input.tools.filter((t) => EXPORT_TOOLS.includes(t.name));
    if (!offered.length || !tree) {
      await say(ctx, 'Approved. This client offered no export tools, so the screen stays where it is.');
      return {};
    }
    await say(ctx, `Approved. Exporting with ${offered.map((t) => t.name).join(' and ')}.`);
    const pending = [];
    for (const tool of offered) {
      const id = uid('call');
      pending.push(id);
      await streamToolCall(ctx, id, tool.name, exportArgs(tool.name, tree), 200);
    }
    return { outcome: { type: 'success', pendingToolCallIds: pending } };
  }
}

/**
 * @typedef {{
 *   input: RunAgentInput,
 *   emit: (event: Record<string, any>) => void,
 *   pace: () => Promise<void>,
 *   stopped: () => boolean,
 *   opts: DesignRunOptions,
 *   catalog: import('../catalog/index.js').Catalog,
 * }} Ctx
 */

/** Stream a short assistant message, a few words per event. */
async function say(/** @type {Ctx} */ ctx, /** @type {string} */ text) {
  const messageId = uid('msg');
  ctx.emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
  const words = text.split(/(?<=\s)/);
  for (let i = 0; i < words.length; i += 4) {
    ctx.emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: words.slice(i, i + 4).join('') });
    if (ctx.opts.delayMs) await sleep(Math.min(ctx.opts.delayMs, 25));
  }
  ctx.emit({ type: EventType.TEXT_MESSAGE_END, messageId });
}

/** Wrap work in STEP_STARTED / STEP_FINISHED. */
async function step(/** @type {Ctx} */ ctx, /** @type {string} */ stepName, /** @type {() => Promise<void>} */ fn) {
  ctx.emit({ type: EventType.STEP_STARTED, stepName });
  try {
    await fn();
  } finally {
    ctx.emit({ type: EventType.STEP_FINISHED, stepName });
  }
}

/**
 * @param {Ctx} ctx
 * @param {string} toolCallId
 * @param {string} toolCallName
 * @param {unknown} args
 * @param {number} chunk
 */
async function streamToolCall(ctx, toolCallId, toolCallName, args, chunk) {
  const parentMessageId = uid('msg');
  ctx.emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName, parentMessageId });
  const json = JSON.stringify(args);
  for (let i = 0; i < json.length; i += chunk) {
    ctx.emit({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: json.slice(i, i + chunk) });
    await ctx.pace();
  }
  ctx.emit({ type: EventType.TOOL_CALL_END, toolCallId });
}

/** @param {string} name @param {UITree} tree */
function exportArgs(name, tree) {
  if (name === 'save_story') return { title: `Generated/${tree.title || 'Screen'}`, tree };
  if (name === 'draw_in_figma') return { frameName: tree.title || 'Generated screen', tree };
  return { tree };
}

/** @param {import('@ag-ui/core').Message[]} messages @param {string} id */
function findToolCall(messages, id) {
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const hit = m.toolCalls?.find((c) => c.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** The last render_ui arguments in the conversation, for tool-mode threads. */
function findLastTree(/** @type {import('@ag-ui/core').Message[]} */ messages) {
  for (const m of [...messages].reverse()) {
    if (m.role !== 'assistant') continue;
    const call = [...(m.toolCalls ?? [])].reverse().find((c) => c.function.name === 'render_ui');
    if (call) return JSON.parse(call.function.arguments);
  }
  return undefined;
}

/**
 * Drop nodes whose type is not (yet) a whole catalog component name, so a
 * half-streamed "Butt" never reaches a renderer as an unknown component.
 * @param {UITree} tree
 * @param {import('../catalog/index.js').Catalog} catalog
 * @returns {UITree}
 */
function knownOnly(tree, catalog) {
  /** @type {UITree['nodes']} */
  const nodes = {};
  for (const [id, n] of Object.entries(tree.nodes)) if (catalog.components[n.type]) nodes[id] = n;
  return { title: tree.title ?? '', root: tree.root && nodes[tree.root] ? tree.root : null, nodes };
}
