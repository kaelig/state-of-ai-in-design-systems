// The client half of the loop, framework-free. A session owns one AG-UI agent
// (local DesignAgent or remote HttpAgent, it does not care), keeps a readable
// snapshot of everything a surface needs to draw, answers frontend tool calls
// with the handlers the surface registered, and resumes interrupts.
//
// React (src/react/use-session.js), Storybook and the playground all sit on
// this, which is the point: a surface is a set of tool handlers plus a
// renderer, and the protocol loop is written once.

import { EventType } from '@ag-ui/client';
import { A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY, a2uiOperationsToTree } from '../a2ui/index.js';
import { catalogToContext, catalogToTools, harbor } from '../catalog/index.js';
import { applyOps, validateTree } from '../tree/tree.js';
import { REVIEW_REASON } from './design-agent.js';

/**
 * @typedef {import('../tree/tree.js').UITree} UITree
 * @typedef {{ at: number, type: string, summary: string, event: any }} LoggedEvent
 * @typedef {{
 *   state: any,
 *   messages: import('@ag-ui/core').Message[],
 *   events: LoggedEvent[],
 *   running: boolean,
 *   step: string | null,
 *   interrupt: import('@ag-ui/core').Interrupt | null,
 *   toolTree: UITree | null,
 *   draftTree: UITree | null,
 *   activities: Record<string, { activityType: string, content: any }>,
 *   source: 'state' | 'tool' | 'activity' | null,
 *   latestActivity: string | null,
 *   validation: { valid: boolean, errors: any[], warnings: any[] } | null,
 *   exports: { tool: string, args: any, result: any }[],
 *   error: string | null,
 * }} SessionSnapshot
 * @typedef {(args: any, session: Session) => any | Promise<any>} ToolHandler
 */

const MAX_EVENTS = 400;
const MAX_TOOL_ROUNDS = 4;

/**
 * @param {{
 *   agent: import('@ag-ui/client').AbstractAgent,
 *   catalog?: import('../catalog/index.js').Catalog,
 *   tools?: import('@ag-ui/core').Tool[],
 *   handlers?: Record<string, ToolHandler>,
 *   forwardedProps?: Record<string, any>,
 * }} options
 */
export function createSession({ agent, catalog = harbor, tools = [], handlers = {}, forwardedProps = {} }) {
  /** @type {SessionSnapshot} */
  let snap = {
    state: agent.state ?? {},
    messages: agent.messages,
    events: [],
    running: false,
    step: null,
    interrupt: null,
    toolTree: null,
    draftTree: null,
    activities: {},
    source: null,
    latestActivity: null,
    validation: null,
    exports: [],
    error: null,
  };
  /** @type {Set<() => void>} */
  const listeners = new Set();
  const set = (/** @type {Partial<SessionSnapshot>} */ patch) => {
    snap = { ...snap, ...patch };
    for (const l of listeners) l();
  };

  /** @type {Record<string, ToolHandler>} */
  const allHandlers = {
    // The default render_ui handler: validate against the catalog, keep the
    // tree for the renderer, and answer with the report. The agent reads the
    // errors and repairs.
    render_ui: (args) => {
      const report = validateTree(args, catalog);
      set({ toolTree: args, draftTree: null, validation: report, source: 'tool' });
      return report;
    },
    ...handlers,
  };
  const allTools = [...catalogToTools(catalog), ...tools];
  // The options of the last send, reused when an interrupt is resumed so the
  // resumed run keeps its mode, pace and review setting.
  /** @type {Record<string, any>} */
  let lastProps = {};

  const log = (/** @type {any} */ event) => {
    const entry = { at: event.timestamp ?? Date.now(), type: event.type, summary: summarize(event), event };
    const events = snap.events.length >= MAX_EVENTS ? [...snap.events.slice(-MAX_EVENTS + 1), entry] : [...snap.events, entry];
    set({ events });
  };

  /** @type {import('@ag-ui/client').AgentSubscriber} */
  const subscriber = {
    onEvent: ({ event }) => log(event),
    onStateChanged: ({ state }) => set({ state }),
    // Whichever channel carried the screen most recently is the one to draw.
    onStateSnapshotEvent: ({ event }) => {
      if (event.snapshot?.ui) set({ source: 'state' });
    },
    onStateDeltaEvent: ({ event }) => {
      if (event.delta.some((op) => op.path.startsWith('/ui'))) set({ source: 'state' });
    },
    onMessagesChanged: ({ messages }) => set({ messages: [...messages] }),
    onStepStartedEvent: ({ event }) => set({ step: event.stepName }),
    onStepFinishedEvent: () => set({ step: null }),
    onToolCallArgsEvent: ({ toolCallName, partialToolCallArgs }) => {
      // Partial JSON, already untruncated by the client: draw what has arrived.
      if (toolCallName === 'render_ui' && partialToolCallArgs?.nodes) set({ draftTree: /** @type {UITree} */ (partialToolCallArgs), source: 'tool' });
    },
    onActivitySnapshotEvent: ({ event }) => {
      set({ activities: { ...snap.activities, [event.messageId]: { activityType: event.activityType, content: event.content } }, source: 'activity', latestActivity: event.messageId });
    },
    onActivityDeltaEvent: ({ event }) => {
      const current = snap.activities[event.messageId];
      if (!current) return;
      set({ activities: { ...snap.activities, [event.messageId]: { ...current, content: applyOps(current.content, event.patch) } }, source: 'activity', latestActivity: event.messageId });
    },
    onCustomEvent: ({ event }) => {
      if (event.name === `${catalog.name}.validation`) set({ validation: event.value });
    },
    onRunErrorEvent: ({ event }) => set({ error: event.message }),
    onRunFailed: ({ error }) => set({ error: error.message }),
  };

  /**
   * Run the agent, then keep answering frontend tool calls until it stops
   * asking or raises an interrupt.
   * @param {import('@ag-ui/client').RunAgentParameters} [params]
   */
  async function drive(params = {}) {
    // Every round of one send, including the automatic follow-ups that answer
    // tool calls, runs with the options the send was made with.
    const runProps = { ...forwardedProps, ...(params.forwardedProps ?? {}) };
    set({ running: true, error: null, interrupt: null });
    try {
      /** @type {any} */
      let finished;
      let round = 0;
      let next = params;
      for (;;) {
        finished = undefined;
        await agent.runAgent(
          { tools: allTools, context: catalogToContext(catalog), forwardedProps: runProps, ...(next.resume ? { resume: next.resume } : {}) },
          { ...subscriber, onRunFinishedEvent: (p) => void (finished = p) },
        );
        if (!finished) break;
        if (finished.outcome === 'interrupt') {
          set({ interrupt: finished.interrupts[0] ?? null });
          break;
        }
        const pending = finished.outcome === 'success' ? finished.pendingToolCallIds ?? [] : [];
        const answerable = pending.filter((/** @type {string} */ id) => allHandlers[toolCall(id)?.function.name ?? '']);
        if (!answerable.length || ++round > MAX_TOOL_ROUNDS) break;
        for (const id of answerable) await answer(id);
        next = {};
      }
    } catch (error) {
      set({ error: String(/** @type {any} */ (error)?.message ?? error) });
    } finally {
      set({ running: false, step: null, messages: [...agent.messages], state: agent.state });
    }
  }

  const toolCall = (/** @type {string} */ id) => {
    for (const m of agent.messages) {
      if (m.role !== 'assistant') continue;
      const c = m.toolCalls?.find((t) => t.id === id);
      if (c) return c;
    }
    return undefined;
  };

  /** Execute one frontend tool call and append its result to the thread. */
  async function answer(/** @type {string} */ id) {
    const call = toolCall(id);
    if (!call) return;
    const args = JSON.parse(call.function.arguments || '{}');
    let result;
    try {
      result = await allHandlers[call.function.name](args, session);
    } catch (error) {
      result = { error: String(/** @type {any} */ (error)?.message ?? error) };
    }
    if (call.function.name !== 'render_ui') set({ exports: [...snap.exports, { tool: call.function.name, args, result }] });
    agent.messages = [...agent.messages, { id: `tool_${id}`, role: 'tool', toolCallId: id, content: JSON.stringify(result ?? null) }];
  }

  const session = {
    agent,
    catalog,
    get snapshot() {
      return snap;
    },
    /** @param {() => void} fn */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /**
     * @param {string} prompt
     * @param {Record<string, any>} [props] forwardedProps for this run
     */
    async send(prompt, props = {}) {
      if (snap.interrupt) await session.resume({ approved: false }, 'cancelled');
      agent.messages = [...agent.messages, { id: `user_${crypto.randomUUID().slice(0, 8)}`, role: 'user', content: prompt }];
      set({ draftTree: null, validation: null, messages: agent.messages });
      lastProps = props;
      await drive({ forwardedProps: props });
    },
    /**
     * Answer the pending review interrupt.
     * @param {{ approved: boolean, notes?: string }} payload
     * @param {'resolved' | 'cancelled'} [status]
     */
    async resume(payload, status = 'resolved') {
      const interrupt = snap.interrupt;
      if (!interrupt) return;
      set({ interrupt: null });
      await drive({ forwardedProps: lastProps, resume: [{ interruptId: interrupt.id, status, ...(status === 'resolved' ? { payload } : {}) }] });
    },
    /** Tear down the running request, if any. */
    abort() {
      agent.abortRun();
    },
    /** The tree to draw right now, whichever mode produced it. */
    currentTree() {
      if (snap.source === 'tool') return snap.draftTree ?? snap.toolTree;
      if (snap.source === 'activity') {
        const activity = snap.latestActivity ? snap.activities[snap.latestActivity] : undefined;
        if (activity?.activityType === A2UI_ACTIVITY_TYPE) return a2uiOperationsToTree(activity.content?.[A2UI_OPERATIONS_KEY]).tree;
        return activity?.content?.ui ?? null;
      }
      return snap.state?.ui?.root ? /** @type {UITree} */ (snap.state.ui) : null;
    },
    /** Theme from shared state or from the latest activity. */
    currentTheme() {
      const activity = snap.source === 'activity' && snap.latestActivity ? snap.activities[snap.latestActivity] : undefined;
      const activityTheme = activity?.activityType === A2UI_ACTIVITY_TYPE ? a2uiOperationsToTree(activity.content?.[A2UI_OPERATIONS_KEY]).theme : activity?.content?.theme;
      return { mode: 'light', density: 'comfortable', ...(activityTheme ?? {}), ...(snap.state?.theme ?? {}) };
    },
    isReview: (/** @type {import('@ag-ui/core').Interrupt | null} */ i) => i?.reason === REVIEW_REASON,
  };
  return session;
}

/** @typedef {ReturnType<typeof createSession>} Session */

/** One line per event for the inspector. */
export function summarize(/** @type {any} */ e) {
  switch (e.type) {
    case EventType.RUN_STARTED:
      return `run ${short(e.runId)} on ${short(e.threadId)}${e.protocolVersion ? ` · AG-UI ${e.protocolVersion}` : ''}`;
    case EventType.RUN_FINISHED:
      return e.outcome?.type === 'interrupt'
        ? `interrupt: ${e.outcome.interrupts.map((/** @type {any} */ i) => i.reason).join(', ')}`
        : e.outcome?.pendingToolCallIds?.length
          ? `waiting on ${e.outcome.pendingToolCallIds.length} tool call(s)`
          : 'done';
    case EventType.RUN_ERROR:
      return e.message;
    case EventType.STEP_STARTED:
    case EventType.STEP_FINISHED:
      return e.stepName;
    case EventType.TEXT_MESSAGE_CONTENT:
      return JSON.stringify(e.delta);
    case EventType.TOOL_CALL_START:
      return `${e.toolCallName}()`;
    case EventType.TOOL_CALL_ARGS:
      return `${e.delta.length} chars`;
    case EventType.STATE_SNAPSHOT:
      return `keys: ${Object.keys(e.snapshot ?? {}).join(', ')}`;
    case EventType.STATE_DELTA:
    case EventType.ACTIVITY_DELTA:
      return (e.delta ?? e.patch).map((/** @type {any} */ o) => `${o.op} ${o.path}${o.op !== 'remove' && typeof o.value === 'object' && o.value?.type ? ` (${o.value.type})` : ''}`).join(' · ');
    case EventType.ACTIVITY_SNAPSHOT:
      return e.activityType;
    case EventType.CUSTOM:
      return `${e.name}${e.value?.errors ? `: ${e.value.errors.length} error(s), ${e.value.warnings.length} warning(s)` : ''}`;
    default:
      return '';
  }
}

const short = (/** @type {string} */ id = '') => (id.length > 12 ? id.slice(0, 8) : id);
