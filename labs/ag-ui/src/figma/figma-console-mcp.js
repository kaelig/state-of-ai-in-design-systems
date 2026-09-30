// Push Harbor screens into Figma through Southleft's Figma Console MCP, from
// Node. The pattern: an agent streams AG-UI; Figma Console MCP is the sink.
//
//   AbstractAgent run ──STATE_SNAPSHOT / STATE_DELTA──► figmaConsoleSubscriber
//        ──tools/call figma_execute { code, timeout }──► figma-console-mcp (stdio)
//        ──WebSocket :9223-9232──► Desktop Bridge plugin ──eval──► Figma canvas
//
// Tool shape, verified in the figma-console-mcp 1.40.7 npm tarball
// (dist/core/write-tools.js) and at the pinned source commit:
// https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/write-tools.ts
//   figma_execute({ code: string, timeout?: number = 5000, fileKey?: string })
//   The server caps timeout at 30000 ms (Math.min(timeout, 30000)) and waits
//   timeout + 2000 ms on the WebSocket (dist/core/websocket-connector.js,
//   executeCodeViaUI); other bridge commands time out at 15000 ms
//   (src/core/websocket-server.ts#L805 at the same commit). There is no
//   code-length limit in the tool schema.
//   The result is one text content item holding JSON:
//   { success, result, error, resultAnalysis, fileContext, timestamp }, or
//   isError with { error, message, hint } when the bridge is not connected.
// Server launch, from the package README: `npx -y figma-console-mcp@latest`
// with FIGMA_ACCESS_TOKEN in the environment; the Desktop Bridge plugin must
// be running in Figma Desktop (Plugins > Development > Import plugin from
// manifest, ~/.figma-console-mcp/plugin/manifest.json).
//
// Because every bridge call is a round trip with a hard timeout, the
// subscriber never sends one call per op: it coalesces STATE_DELTA ops for
// `coalesceMs` (250 ms by default), keeps one call in flight, and when a call
// times out it retries once as a full draw, which is idempotent (a patch is
// not: replaying "append child" would append twice).
//
// CLI:
//   node src/figma/figma-console-mcp.js --prompt "sign up form" --dry-run
//     runs the DesignAgent locally in state mode and prints the exact MCP
//     JSON-RPC request it would send (one full draw).
//   ... --dry-run --incremental
//     prints every request the subscriber would send while the run streams.
//   node src/figma/figma-console-mcp.js --prompt "sign up form"
//     spawns figma-console-mcp over stdio and draws into the open file.

import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { harbor } from '../catalog/index.js';
import { applyOps } from '../tree/tree.js';
import { drawPayload, patchPayload, scriptFromPayload } from './tree-to-figma.js';

export const FIGMA_CONSOLE_MCP_PACKAGE = 'figma-console-mcp';
export const FIGMA_CONSOLE_MCP_VERSION = '1.40.7';
export const EXECUTE_TOOL = 'figma_execute';
/** figma_execute's own ceiling; larger values are clamped by the server. */
export const MAX_EXECUTE_TIMEOUT = 30000;

/**
 * @typedef {import('./tree-to-figma.js').FigmaRunSummary} FigmaRunSummary
 * @typedef {{ name: string, arguments: { code: string, timeout: number, fileKey?: string } }} ToolCall
 * @typedef {(name: string, args: Record<string, any>) => Promise<any>} CallTool  resolves to an MCP CallToolResult
 */

/**
 * The `tools/call` params for figma_execute.
 * @param {string} code
 * @param {{ timeout?: number, fileKey?: string }} [options]
 * @returns {ToolCall}
 */
export function executeCall(code, { timeout = 5000, fileKey } = {}) {
  /** @type {ToolCall['arguments']} */
  const args = { code, timeout: Math.min(timeout, MAX_EXECUTE_TIMEOUT) };
  if (fileKey) args.fileKey = fileKey;
  return { name: EXECUTE_TOOL, arguments: args };
}

/**
 * figma_execute params that draw (reconcile) a whole tree. The first draw in a
 * file also creates Harbor's variables and loads fonts, hence the long timeout.
 * @param {import('../tree/tree.js').UITree} tree
 * @param {import('../catalog/index.js').Catalog} [catalog]
 * @param {import('./tree-to-figma.js').FigmaScriptOptions & { timeout?: number, fileKey?: string }} [options]
 */
export function drawCall(tree, catalog = harbor, options = {}) {
  return executeCall(scriptFromPayload(drawPayload(tree, catalog, options)), { timeout: options.timeout ?? MAX_EXECUTE_TIMEOUT, fileKey: options.fileKey });
}

/**
 * figma_execute params that apply STATE_DELTA ops to a frame drawn earlier.
 * @param {import('@ag-ui/core').JsonPatchOperation[]} ops
 * @param {import('../catalog/index.js').Catalog} [catalog]
 * @param {import('./tree-to-figma.js').FigmaScriptOptions & { base?: string, timeout?: number, fileKey?: string }} [options]
 */
export function patchCall(ops, catalog = harbor, options = {}) {
  return executeCall(scriptFromPayload(patchPayload(ops, catalog, options)), { timeout: options.timeout ?? 15000, fileKey: options.fileKey });
}

/** The JSON-RPC 2.0 message an MCP client writes to the server for a tool call. */
export const jsonRpcRequest = (/** @type {number} */ id, /** @type {ToolCall} */ call) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: call });

/**
 * Unwrap figma_execute's result: the script's return value, or an Error.
 * @param {any} response an MCP CallToolResult
 * @returns {any}
 */
export function parseExecuteResult(response) {
  const text = response?.content?.find((/** @type {any} */ c) => c.type === 'text')?.text;
  /** @type {any} */
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`figma_execute returned no JSON: ${String(text).slice(0, 200)}`);
  }
  if (response.isError || body.success === false || body.error) {
    const error = new Error(`figma_execute failed: ${body.error ?? body.message ?? 'unknown error'}${body.hint ? ` (${body.hint})` : ''}`);
    /** @type {any} */ (error).body = body;
    throw error;
  }
  return body.result;
}

const isTimeout = (/** @type {any} */ error) => /timed?[ -]?out/i.test(String(error?.message ?? error));

/**
 * An AG-UI subscriber that mirrors a run's shared state into Figma. Attach it
 * to any AbstractAgent (`agent.runAgent(params, subscriber)` or
 * `agent.subscribe(subscriber)`): STATE_SNAPSHOT becomes a draw, STATE_DELTA
 * ops under `base` or `/theme` are coalesced into patch calls, one call in
 * flight at a time.
 *
 * @param {{
 *   callTool: CallTool,
 *   catalog?: import('../catalog/index.js').Catalog,
 *   key?: string,
 *   frameName?: string,
 *   base?: string,
 *   coalesceMs?: number,
 *   fileKey?: string,
 *   onResult?: (summary: FigmaRunSummary, call: ToolCall) => void,
 *   onError?: (error: Error) => void,
 * }} options
 */
export function figmaConsoleSubscriber(options) {
  const { callTool, catalog = harbor, base = '/ui', coalesceMs = 250, fileKey, onResult = () => {}, onError = () => {} } = options;
  /** @type {any} */
  let state = null;
  let key = options.key;
  /** @type {import('@ag-ui/core').JsonPatchOperation[]} */
  let pending = [];
  let drawPending = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  /** @type {Promise<void>} */
  let chain = Promise.resolve();
  /** @type {ToolCall[]} */
  const calls = [];
  /** @type {Error[]} */
  const errors = [];

  const under = (/** @type {string} */ path, /** @type {string} */ prefix) => path === prefix || path.startsWith(`${prefix}/`);
  const frameName = () => options.frameName ?? (state?.ui?.title || 'Harbor screen');
  const draw = () =>
    drawCall(state?.ui ?? { title: '', root: null, nodes: {} }, catalog, { key, frameName: frameName(), theme: state?.theme ?? {}, fileKey });

  /** @param {ToolCall} call @param {number} retries */
  const invoke = async (call, retries) => {
    calls.push(call);
    try {
      const summary = parseExecuteResult(await callTool(call.name, call.arguments));
      onResult(summary, call);
      return summary;
    } catch (error) {
      if (retries > 0 && isTimeout(error)) return invoke(draw(), retries - 1);
      throw error;
    }
  };

  const send = async () => {
    if (!drawPending && !pending.length) return;
    const ops = pending;
    const full = drawPending;
    pending = [];
    drawPending = false;
    const summary = await invoke(full ? draw() : patchCall(ops, catalog, { key, base, fileKey }), 1);
    // The frame was missing or out of step: resynchronize from our copy.
    if (summary?.needsRedraw) await invoke(draw(), 0);
  };
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    chain = chain.then(send).catch((/** @type {Error} */ error) => {
      errors.push(error);
      onError(error);
    });
    return chain;
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(flush, coalesceMs);
  };

  return {
    /** @param {{ event: import('@ag-ui/core').StateSnapshotEvent, input?: import('@ag-ui/core').RunAgentInput }} params */
    onStateSnapshotEvent({ event, input }) {
      key ??= input?.threadId;
      state = structuredClone(event.snapshot ?? {});
      drawPending = true;
      pending = [];
      schedule();
    },
    /** @param {{ event: import('@ag-ui/core').StateDeltaEvent, input?: import('@ag-ui/core').RunAgentInput }} params */
    onStateDeltaEvent({ event, input }) {
      key ??= input?.threadId;
      const ops = event.delta ?? [];
      try {
        state = applyOps(state ?? {}, ops);
      } catch {
        drawPending = true;
      }
      const relevant = ops.filter((op) => under(op.path, base) || under(op.path, '/theme'));
      if (!relevant.length) return;
      if (!drawPending) pending.push(...relevant);
      schedule();
    },
    /** Send whatever is queued and wait for Figma, so the run ends with the canvas in step. */
    async onRunFinalized() {
      await flush();
    },
    /** Flush now and resolve when every queued call has finished. */
    idle: flush,
    calls,
    errors,
    get state() {
      return state;
    },
  };
}

/**
 * Spawn figma-console-mcp over stdio with the MCP SDK and return a callTool.
 * The SDK is loaded lazily so the dry run and the tests never need it.
 * @param {{ command?: string, args?: string[], env?: Record<string, string | undefined>, stderr?: 'inherit' | 'ignore' | 'pipe' }} [options]
 */
export async function connectFigmaConsole(options = {}) {
  const { command = 'npx', args = ['-y', `${FIGMA_CONSOLE_MCP_PACKAGE}@${FIGMA_CONSOLE_MCP_VERSION}`], env = process.env, stderr = 'inherit' } = options;
  const [{ Client }, { StdioClientTransport }] = await Promise.all([import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/client/stdio.js')]);
  /** @type {Record<string, string>} */
  const cleanEnv = {};
  for (const [k, v] of Object.entries(env)) if (typeof v === 'string') cleanEnv[k] = v;
  const transport = new StdioClientTransport({ command, args, env: cleanEnv, stderr });
  const client = new Client({ name: 'harbor-ag-ui-lab', version: '0.1.0' });
  await client.connect(transport);
  const { tools } = await client.listTools();
  if (!tools.some((t) => t.name === EXECUTE_TOOL)) {
    await client.close();
    throw new Error(`${command} ${args.join(' ')} does not offer ${EXECUTE_TOOL}.`);
  }
  return {
    client,
    /** @type {CallTool} */
    callTool: (name, toolArgs) =>
      client.callTool({ name, arguments: toolArgs }, undefined, { timeout: Math.min(Number(toolArgs?.timeout ?? 5000), MAX_EXECUTE_TIMEOUT) + 10000 }),
    close: () => client.close(),
  };
}

/**
 * Run the DesignAgent locally in state mode, the way the server would, and
 * return the tree it built.
 * @param {string} prompt
 * @param {{ subscriber?: import('@ag-ui/client').AgentSubscriber, threadId?: string, delayMs?: number }} [options]
 *   delayMs paces the stream per node (0 builds instantly; the agent's own default is 45)
 */
export async function runDesignAgent(prompt, options = {}) {
  const { DesignAgent } = await import('../agent/design-agent.js');
  const agent = new DesignAgent({
    threadId: options.threadId ?? `thread_${crypto.randomUUID().slice(0, 8)}`,
    initialMessages: [{ id: 'msg_prompt', role: 'user', content: prompt }],
  });
  await agent.runAgent({ forwardedProps: { mode: 'state', delayMs: options.delayMs ?? 0 } }, options.subscriber);
  return { agent, tree: /** @type {import('../tree/tree.js').UITree} */ (agent.state?.ui), threadId: agent.threadId };
}

/** @param {string[]} argv */
async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      prompt: { type: 'string', short: 'p' },
      'dry-run': { type: 'boolean', default: false },
      incremental: { type: 'boolean', default: false },
      'frame-name': { type: 'string' },
      'file-key': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help || !values.prompt) {
    process.stderr.write(
      'Usage: node src/figma/figma-console-mcp.js --prompt "sign up form" [--dry-run] [--incremental] [--frame-name NAME] [--file-key KEY]\n' +
        '  --dry-run      print the MCP tools/call request(s) instead of sending them\n' +
        '  --incremental  stream: one draw, then coalesced patches as the agent emits STATE_DELTA\n',
    );
    process.exitCode = values.help ? 0 : 2;
    return;
  }
  const common = { frameName: values['frame-name'], fileKey: values['file-key'] };

  if (values['dry-run']) {
    if (!values.incremental) {
      const { tree, threadId } = await runDesignAgent(values.prompt);
      const call = drawCall(tree, harbor, { ...common, key: threadId });
      process.stdout.write(JSON.stringify(jsonRpcRequest(1, call), null, 2) + '\n');
      return;
    }
    // Record what the subscriber would send; answer like a bridge that drew it.
    const ok = { content: [{ type: 'text', text: JSON.stringify({ success: true, result: { ok: true, created: [], updated: [], removed: [], warnings: [] } }) }] };
    const sub = figmaConsoleSubscriber({ callTool: async () => ok, ...common });
    await runDesignAgent(values.prompt, { subscriber: sub, delayMs: 45 });
    await sub.idle();
    process.stdout.write(JSON.stringify(sub.calls.map((c, i) => jsonRpcRequest(i + 1, c)), null, 2) + '\n');
    return;
  }

  const figma = await connectFigmaConsole();
  try {
    const sub = figmaConsoleSubscriber({
      callTool: figma.callTool,
      ...common,
      onResult: (s, call) =>
        process.stderr.write(
          `${s.op} ${call.arguments.code.length} B: ${s.created?.length ?? 0} created, ${s.updated?.length ?? 0} updated, ${s.removed?.length ?? 0} removed${s.warnings?.length ? `, ${s.warnings.length} warning(s)` : ''}\n`,
        ),
      onError: (e) => process.stderr.write(`${e.message}\n`),
    });
    const { tree } = await runDesignAgent(values.prompt, { subscriber: sub, delayMs: 45 });
    await sub.idle();
    process.stderr.write(`Drew "${tree?.title}" with ${sub.calls.length} figma_execute call(s)${sub.errors.length ? `, ${sub.errors.length} failed` : ''}.\n`);
    if (sub.errors.length) process.exitCode = 1;
  } finally {
    await figma.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
