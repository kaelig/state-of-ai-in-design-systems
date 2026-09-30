# Figma Console MCP (Southleft), the Figma<>code agent tooling around it, and where AG-UI could plug in (as of 2026-09-30)

Research method note: the `southleft/figma-console-mcp` and `southleft/story-ui` repositories were cloned at their current `main` heads (figma-console-mcp commit `db1967f`, 2026-09-28; story-ui commit `f960dda`, 2026-09-25), and the tool registry, Desktop Bridge plugin and WebSocket server source were read directly. GitHub links below are pinned to those commits. `npm view` returned `figma-console-mcp` **1.40.7** (npm `time.modified` 2026-09-28) and `@tpitre/story-ui` **5.21.2** (2026-09-25). The State of AI in Design Systems MCP has **no records** for Figma Console MCP or Southleft (searches for "Figma Console MCP" and "Southleft" returned 0 hits; snapshot 2026-07-28). It does have a Figma platform record, which is cited below.

---

## 1. Architecture: how Figma Console MCP connects to Figma, and what runs where

### Takeaway
Figma Console MCP is a Node MCP server (stdio) that runs a local HTTP+WebSocket server on ports 9223–9232. A development-imported Figma plugin (the "Desktop Bridge") opens WebSocket connections *from its UI iframe* to that server and relays commands by `postMessage` to the plugin main thread, which calls the Figma Plugin API. The server also calls the Figma REST API with a personal access token. A separate Cloudflare Workers deployment (`figma-console-mcp.southleft.com`) serves `/sse` and `/mcp` and reaches the same plugin through a Durable Object WebSocket relay after a 6-character pairing. The earlier Chrome DevTools Protocol path (Figma launched with `--remote-debugging-port=9222`) broke in February 2026 and was removed from Local Mode in v1.26.0 (May 2026).

### Cited Findings

**Deployment modes and entry points**
- The package declares itself as "Local (WebSocket Desktop Bridge plugin) and Cloudflare Workers (paired + remote) modes". The npm `bin` is `dist/local.js`, the Worker is built separately with `wrangler`, and Node >=18 is required — [package.json](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/package.json)
- Four ways to connect: NPX (local), Local Git, Cloud Mode (web AI clients with write access through pairing) and Remote SSE (read-only) — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- Local entry: `src/local.ts` builds an `McpServer` and connects a `StdioServerTransport` — [src/local.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts)
- Cloud entry: `src/index.ts` defines `FigmaConsoleMCPv3 extends McpAgent` (from Cloudflare's `agents/mcp`) and serves `/sse` (legacy SSE), `/mcp` (a stateless `WebStandardStreamableHTTPServerTransport`), `/ws/pair`, OAuth endpoints (`/authorize`, `/token`, `/oauth/callback`, `/.well-known/oauth-*`) and `/health` — [src/index.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/index.ts)
- Hosted endpoints: `https://figma-console-mcp.southleft.com/sse` (Remote SSE) and `https://figma-console-mcp.southleft.com/mcp` (Cloud Mode, "Auth: Your Figma PAT as Bearer token") — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- Docs site: `docs.figma-console-mcp.southleft.com` (Mintlify, `docs/mint.json` version "1.40.7"). The live architecture page shows the same flows as the repo doc — [docs site, architecture](https://docs.figma-console-mcp.southleft.com/architecture); [docs/mint.json](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/mint.json)

**Local data path (the one that matters for a desktop Figma<>code loop)**
- The flow as documented: "MCP Server ←WebSocket (ports 9223–9232)→ Plugin UI (ui.html) ←postMessage→ Plugin Code (code.js) ←figma.*→ Figma". The steps are: the server sends a JSON command over WebSocket; the plugin UI forwards it with `postMessage`; plugin code runs Plugin API calls and returns the result with `figma.ui.postMessage`; the UI sends it back over WebSocket; the server receives a "correlated response" — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- Transport abstraction: the `IFigmaConnector` interface has two implementations. `WebSocketConnector` (local, `ws://localhost:9223–9232`) and `CloudWebSocketConnector` (remote, "Fetch RPC to Durable Object") — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- Request/response correlation: `sendCommand(method, params, timeoutMs = 15000, targetFileKey?)` generates ids of the form `ws_<n>_<ts>` and rejects with "WebSocket command … timed out" — [src/core/websocket-server.ts#L805](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L805)
- Port behavior: the server tries 9223, then falls back through 9224–9232. The plugin "scans all ports in the range and connects to every active server". `FIGMA_WS_PORT` and `FIGMA_WS_HOST` override the port and bind address (`0.0.0.0` for Docker) — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- The same port serves HTTP. `/health` returns `{status, version, clients, connectedClients, uptime}` with `Access-Control-Allow-Origin: *` and only `GET, OPTIONS`; every other path returns 404 — [src/core/websocket-server.ts#L254](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L254)
- WebSocket origin check (`verifyClient`): it accepts no origin (a local process), `'null'` (the "Sandboxed iframe / Figma Desktop plugin UI"), `https://www.figma.com` and `https://figma.com`, and rejects everything else. A CSWSH (cross-site WebSocket hijacking) `startsWith` bug was fixed to an exact match in v1.33.0 — [src/core/websocket-server.ts#L314](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L314); [README roadmap v1.33.0](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- Multiple files: "one per open Figma file. Each connection is tracked by file key with independent state (selection, document changes, console logs)". `figma_navigate` with `lock: true` pins the active file (v1.36.0), and `figma_execute_across_files` fans out to several files (v1.39.0) — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)

**What runs where**
- Node process (the MCP server): tool registry, Figma REST client, WebSocket/HTTP server, event buffers and caches — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- Plugin UI iframe (`ui.html`, about 60 KB): the WebSocket client. It scans ports 9223–9232 (`new WebSocket('ws://localhost:' + port)`), runs an HTTP `/health` discovery loop with `fetch`, and in Cloud Mode opens `new WebSocket(CLOUD_RELAY_HOST + '/ws/pair?code=' + code)`. It relays to the main thread with `parent.postMessage({ pluginMessage: … }, '*')` — [figma-desktop-bridge/ui.html](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/ui.html)
- Plugin main thread (`code.js`, about 7,360 lines): header comment "Uses postMessage to communicate with ui.html (bypassing worker sandbox limitations), which then forwards messages to the MCP server over the WebSocket bridge". It shows a 240×40 status UI, handles 74 distinct `msg.type` commands (`EXECUTE_CODE`, `CREATE_VARIABLE`, `INSTANTIATE_COMPONENT`, `CREATE_COMPONENT_SET`, `CREATE_SLOT` and more), and runs `figma_execute` code through `eval` of an async IIFE with a default 5,000 ms timeout ("AsyncFunction is restricted in Figma's plugin sandbox, but eval works") — [figma-desktop-bridge/code.js](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js)
- Plugin manifest: `"id": "figma-desktop-bridge-mcp"`, `editorType: ["figma","figjam","slides","dev"]`, `capabilities: ["inspect"]`, `enablePrivatePluginApi: true`, `permissions: ["teamlibrary"]`, `documentAccess: "dynamic-page"`. `networkAccess.allowedDomains` lists `http://localhost:9223`…`9232`, `ws://localhost:9223`…`9232`, `wss://figma-console-mcp.southleft.com` and `https://figma-console-mcp.southleft.com`, with the reasoning "Connects to local MCP server via WebSocket (port range 9223-9232 for multi-instance), and optionally to the cloud relay for remote write access." — [figma-desktop-bridge/manifest.json](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/manifest.json)
- Distribution: the plugin is imported as a **development plugin** ("Plugins → Development → Import plugin from manifest…"). Its files are copied to `~/.figma-console-mcp/plugin/` on server start, and updating the plugin requires re-importing `manifest.json` because "Figma caches plugin files at the application level" — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md); [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- Plugin version handshake: `PLUGIN_VERSION = '1.39.0'` ("Last release in which plugin files changed"), reported in `FILE_INFO` — [figma-desktop-bridge/code.js#L12](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js#L12)

**Cloud relay path**
- "Cloud MCP Server →fetch RPC→ PluginRelayDO ←WebSocket (wss://)→ Plugin UI (ui.html) ←postMessage→ Plugin Code (code.js) ←figma.*→ Figma". Pairing: `figma_pair_plugin` returns a 6-character code stored in KV with a 5-minute TTL and single use. After pairing, the relay DO id is stored in KV as `relay:{bearerToken}` with a 24-hour TTL. The DO uses hibernation-safe patterns (`this.ctx.getWebSockets('plugin')`) — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- "Cloud Mode still uses Cloudflare's Browser Rendering API for `figma_navigate`, `figma_get_console_logs`, and `figma_take_screenshot`; write/plugin tools route through the Cloud Plugin Relay Durable Object instead." — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- `registerWriteTools()` is called from both `src/local.ts` and `src/index.ts`, "This ensures tool parity between local and cloud modes" — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md); [src/index.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/index.ts)

**REST API and auth**
- REST endpoints used: `GET /v1/files/:key`, `/v1/files/:key/nodes`, `/v1/files/:key/styles`, `/v1/files/:key/variables/local` ("Enterprise") and `/v1/images/:key`. Auth is OAuth 2.0 in Remote Mode and a PAT in the environment for Local Mode — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- The Local PAT (`FIGMA_ACCESS_TOKEN`) needs these scopes: "File content (Read), File versions (Read), Variables (Read), Comments (Read and write)". Variables work on any plan through the Plugin API rather than the Enterprise REST endpoint — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- **Internal inconsistency:** the README's Cloud Mode setup says "Auth: Your Figma PAT as Bearer token", while its comparison table lists Cloud Mode authentication as "OAuth (automatic)" — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)

**Chrome DevTools Protocol history (flagged as superseded)**
- Before February 2026, Local Mode could attach over CDP to Figma Desktop launched with `--remote-debugging-port=9222` (`launch-figma-debug.sh/.ps1`, `FIGMA_DEBUG_HOST/PORT`, `puppeteer-core`, `chrome-remote-interface`). All of these were deleted in v1.26.0 (2026-05-16): "Local Mode no longer carries the Chrome DevTools Protocol / Puppeteer transport at all" — [CHANGELOG 1.26.0](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/CHANGELOG.md)
- Issue #8 (2026-02-06), "Figma 126.1.2 broke remote debugging port support": "Remote debugging port (9222) refuses connections after Figma update" — [issue #8](https://github.com/southleft/figma-console-mcp/issues/8). (The GitHub search listing shows it as Closed, but the fetched issue page showed no maintainer comment.)
- v1.8.0 (2026-02-07) added the "WebSocket Bridge transport — Automatic fallback transport layer for when Figma removes Chrome DevTools Protocol (CDP) support". v1.11.0 (2026-02-22): "Figma has blocked `--remote-debugging-port`, making CDP non-functional" — [CHANGELOG](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/CHANGELOG.md)
- v1.40.5 (2026-09-23) moved `@cloudflare/puppeteer` and `agents` (Worker-only) to devDependencies. The npm install went from 173 MB to 64 MB with 0 audit vulnerabilities — [CHANGELOG 1.40.5](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/CHANGELOG.md)

**Data-path diagram (assembled from the cited architecture doc, manifest and source)**
```
MCP client (Claude Code / Cursor / Claude Desktop)
   │ stdio JSON-RPC (MCP)
   ▼
Node process: figma-console-mcp (dist/local.js)
   ├── Figma REST client ──HTTPS + PAT──► api.figma.com (files, nodes, styles, images, versions, comments)
   └── HTTP+WS server :9223 (fallback …:9232), GET /health, origin check (null | figma.com)
          ▲  JSON commands {id, method, params} / results; unsolicited events
          │  WebSocket (the plugin dials out to every live port)
Figma Desktop ─ Desktop Bridge plugin (dev-imported)
   ├── UI iframe  ui.html  (browser APIs: WebSocket, fetch; origin "null")
   │        ▲ parent.postMessage({pluginMessage}) / figma.ui.postMessage
   │        ▼
   └── main thread code.js (QuickJS sandbox; figma.* Plugin API; eval for figma_execute;
                             figma.on('documentchange'|'selectionchange'|'currentpagechange'); console.* hooks)

Cloud variant: web MCP client ─HTTPS /mcp (Bearer)─► Cloudflare Worker (McpAgent)
     ─fetch RPC─► PluginRelayDO ◄─wss /ws/pair?code=XXXXXX─ same ui.html ─postMessage─► code.js
```
— [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md); [manifest.json](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/manifest.json); [code.js](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js)

### Inferences
- The Desktop Bridge is already a working example of the pattern an AG-UI-aware Figma plugin would need: all networking lives in the UI iframe (null origin, domains allowlisted in `networkAccess`), and the main thread is a command executor reached by `postMessage`. The architecture uses the plugin as a **server-controlled executor** (the plugin dials out, but the Node server sends the commands). It does not use the plugin as an agent frontend.
- The cloud relay shows that Southleft is willing to put a stateful broker (a Durable Object) between an HTTP-based client and the plugin. An AG-UI endpoint would need the same kind of broker if the agent is not on the designer's machine.

### Gaps
- I did not read `src/core/cloud-websocket-relay.ts` in full. Relay framing details (message envelope, backpressure) come from the architecture doc only.
- There is no public statement on whether Figma plans to allow the Desktop Bridge (with `enablePrivatePluginApi` and localhost domains) to be published to Community. Today it is dev-imported only.

---

## 2. Tool surface: complete list, and which tools write to the canvas

### Takeaway
The source at v1.40.7 registers **126 distinct tool names**. That is 122 core tools (`figma_*` and `figjam_*`) plus 4 MCP-App tools gated by `ENABLE_MCP_APPS=true`. Local Mode gets 121 core tools (all but the cloud-only `figma_pair_plugin`), which matches the "121 tools" headline. Remote SSE is documented at 9 read-only tools and Cloud Mode at 101. About 70 tools mutate the Figma document through the Plugin API; `figma_execute` and `figma_execute_across_files` can run arbitrary Plugin API JavaScript.

### Cited Findings
- **Counting method:** I extracted names from every `server.tool(…)`, `registerTool(…)` and `registerAppTool(server, "…")` call in `src/**/*.ts`. That gives 122 non-app names (including `figma_pair_plugin`, which only `src/index.ts` registers) plus `figma_browse_tokens`, `token_browser_refresh`, `figma_audit_design_system` and `ds_dashboard_refresh`. `local.ts` registers the MCP Apps only `if (process.env.ENABLE_MCP_APPS === "true")` — [src/local.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts); [src/apps/token-browser/server.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/apps/token-browser/server.ts); [src/apps/design-system-dashboard/server.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/apps/design-system-dashboard/server.ts)
- **Conflicting published counts:** the README capability table says "Total tools available: **114** (NPX/Local Git) / **101** (Cloud) / **9** (Remote SSE)". The same README says "NPX/Local Git gives the full 121 tools". The architecture doc says "121 tools in Local Mode, 9 in Remote Mode". The comparison doc's card says both "107 dedicated tools" and "121 tools" — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md); [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md); [docs/figma-mcp-vs-figma-console-mcp.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/figma-mcp-vs-figma-console-mcp.md). Southleft's March 8, 2026 blog post said "57+ tools", and its January 14, 2026 post said "14 Figma tools" in Remote mode. Both are stale — [Southleft, Mar 2026](https://southleft.com/insights/ai/figma-mcp-vs-figma-console-mcp); [Southleft, Jan 2026](https://southleft.com/insights/ai/figma-console-mcp-ai-powered-design-system-management)
- Every tool response carries `_mcp: "figma-console-mcp"`, and errors are prefixed `[figma-console-mcp]` ("Cross-MCP identity") — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)

**Complete tool list** (names verbatim from source; purposes from the `docs/tools.md` Quick Reference or the tool's own description). **W** = writes to the Figma document or canvas through the Plugin API; **W-rest** = writes through the REST API (not canvas nodes); **W-disk** = writes local files; blank = read or analysis. Sources: [docs/tools.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/tools.md), [src/core/write-tools.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/write-tools.ts), [src/local.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts), [src/core/slides-tools.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/slides-tools.ts), [src/core/figjam-tools.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/figjam-tools.ts), [src/core/slot-tools.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/slot-tools.ts)

| Group | Tool | Purpose | Write |
|---|---|---|---|
| Status / navigation (6) | `figma_get_status` | Connection status; `probe:true` does a live round trip | |
| | `figma_diagnose` | "Designer-readable health check" (plugin, file, token state) | |
| | `figma_reconnect` | "Force a complete reconnection to Figma Desktop" | |
| | `figma_navigate` | Switch the active file among files that already have the plugin open; `lock: true` pins the target | |
| | `figma_list_open_files` | "List all Figma files currently connected via the Desktop Bridge plugin" | |
| | `figma_reload_plugin` | Reload the plugin UI | |
| Console (3) | `figma_get_console_logs` | Retrieve buffered console logs with filters | |
| | `figma_watch_console` | "Stream console logs in real-time for a specified duration (max 5 minutes)" (see §3: blocks, then returns) | |
| | `figma_clear_console` | Clear the log buffer | |
| Screenshots (3) | `figma_take_screenshot` | Page or node image; bridge `exportAsync` first, REST fallback | |
| | `figma_capture_screenshot` | Node screenshot from plugin runtime state ("reliable for validating changes immediately") | |
| | `figma_get_component_image` | Render a node via REST (PNG/JPG/SVG/PDF; URL valid 30 days) | |
| Real-time (2) | `figma_get_selection` | "Currently selected nodes… WebSocket-only" | |
| | `figma_get_design_changes` | "Returns buffered change events… WebSocket-only" | |
| Design-system reads (14) | `figma_get_variables` | Extract tokens/variables with CSS/Tailwind/TS/Sass export | |
| | `figma_get_styles` | Color, text, effect and grid styles | |
| | `figma_get_component` | Component data | |
| | `figma_get_component_for_development` | Component tree (depth 4) with bound variables, for implementation | |
| | `figma_get_file_data` | File structure with verbosity control | |
| | `figma_get_file_for_plugin` | File data filtered for plugin development | |
| | `figma_get_design_system_kit` | "Full design system in one call" (tokens, components, styles, visual specs) | |
| | `figma_get_design_system_summary` | Compact overview of the design system | |
| | `figma_get_token_values` | Variable values by mode | |
| | `figma_search_components` | Find components (local and library), returns keys for instantiation | |
| | `figma_get_component_details` | Variants, properties and keys for one component | |
| | `figma_get_library_components` | Published components from a library file | |
| | `figma_get_library_component_by_key` | Resolve a component key to props, variants and specs | |
| | `figma_get_library_variables` | Variables from subscribed libraries (no Enterprise plan needed) | |
| Deep analysis (2) | `figma_get_component_for_development_deep` | Unlimited-depth tree with resolved token names | |
| | `figma_analyze_component_set` | "Variant state machine" with CSS pseudo-class mappings | |
| Audit (1, +1 app) | `figma_audit_design_system_report` | "Scored six-category health audit" as data | |
| Token sync (2) | `figma_export_tokens` | Figma variables → DTCG JSON + 9 other formats | W-disk |
| | `figma_import_tokens` | "Push code-side token edits back to Figma (diff-aware merge)" | W |
| Library import (1) | `figma_import_library_variable` | Import a library variable into the file | W |
| Codebase → DS extraction, Local only (7) | `figma_ds_analyze` | Scan production codebases: inventory, classification, architecture | |
| | `figma_ds_extract_tokens` | Mine styling into DTCG tokens with provenance | W-disk |
| | `figma_ds_scaffold` | Generate the DS package, token files and showcase docs | W-disk |
| | `figma_ds_setup_storybook` | Wire a fresh Storybook workshop to the extracted system | W-disk |
| | `figma_ds_extract_component` | Per-component porting manifest + CSF3 story scaffold | W-disk |
| | `figma_ds_verify` | "Deterministic fidelity evals + Figma round-trip readiness" | |
| | `figma_ds_status` | Read or record porting progress (`.extraction/status.json`) | W-disk |
| Design creation (7) | `figma_execute` | "Execute arbitrary JavaScript in Figma's plugin context… CAUTION: Can modify your document" | W |
| | `figma_execute_across_files` | Same code in several connected files at once | W |
| | `figma_create_component_set` | Component set with variants in one call (axes matrix) | W |
| | `figma_arrange_component_set` | Organize variants with labels | W |
| | `figma_set_description` | Component, component set or style description | W |
| | `figma_instantiate_component` | Create a component instance (local + library; pass `componentKey` and `nodeId`) | W |
| | `figma_set_instance_properties` | Update component properties on an instance | W |
| Component properties (3) | `figma_add_component_property` / `figma_edit_component_property` / `figma_delete_component_property` | BOOLEAN, TEXT, INSTANCE_SWAP and SLOT property CRUD | W |
| Slots (5) | `figma_create_slot` | Add a slot to a component (auto-linked SLOT property) | W |
| | `figma_get_slots` | List slots on a component, set or instance | |
| | `figma_append_to_slot` | "Populate an instance's slot" (clone a node or create content) | W |
| | `figma_reset_slot` | Clear a slot on an instance | W |
| | `figma_add_slot_property` | Retrofit a frame as a slot | W |
| Node manipulation (10) | `figma_resize_node`, `figma_move_node`, `figma_clone_node`, `figma_delete_node`, `figma_rename_node`, `figma_set_text`, `figma_set_fills`, `figma_set_strokes`, `figma_create_child`, `figma_set_image_fill` | Structured node edits; fills and strokes accept a `variableId` for token binding (v1.30.0) | W |
| Variables (11) | `figma_create_variable_collection`, `figma_create_variable`, `figma_update_variable`, `figma_rename_variable`, `figma_delete_variable`, `figma_delete_variable_collection`, `figma_add_mode`, `figma_rename_mode`, `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens` | Variable and collection CRUD; batches of up to 100; atomic collection + modes + variables | W |
| Design–code parity (2) | `figma_check_design_parity` | "Compare Figma specs vs code implementation" | |
| | `figma_generate_component_doc` | Component docs from Figma + code, optional Figma version + git history | |
| Comments (3) | `figma_get_comments` / `figma_post_comment` / `figma_delete_comment` | REST comments API | W-rest (post/delete) |
| Annotations (3) | `figma_get_annotations` / `figma_set_annotations` / `figma_get_annotation_categories` | Dev Mode annotations | W (set) |
| Accessibility (3) | `figma_lint_design` | "14 WCAG checks with AA/best-practice level tagging" | |
| | `figma_audit_component_accessibility` | Component scorecard: states, focus, color-blind simulation | |
| | `figma_scan_code_accessibility` | axe-core scan of HTML (JSDOM) | |
| FigJam (10) | `figjam_create_sticky`, `figjam_create_stickies`, `figjam_create_connector`, `figjam_create_shape_with_text`, `figjam_create_table`, `figjam_create_code_block`, `figjam_create_section`, `figjam_auto_arrange` | Create and arrange board content | W |
| | `figjam_get_board_contents`, `figjam_get_connections` | Read the board and its connection graph | |
| Slides (17) | `figma_create_slide`, `figma_delete_slide`, `figma_duplicate_slide`, `figma_reorder_slides`, `figma_set_slide_background`, `figma_set_slide_transition`, `figma_skip_slide`, `figma_add_text_to_slide`, `figma_add_shape_to_slide` | Deck edits | W |
| | `figma_focus_slide`, `figma_set_slides_view_mode` | Viewport or view state only | (UI) |
| | `figma_list_slides`, `figma_get_slide_content`, `figma_get_slide_grid`, `figma_get_slide_transition`, `figma_get_focused_slide`, `figma_get_text_styles` | Reads | |
| Version history (6) | `figma_get_file_versions`, `figma_get_file_at_version`, `figma_diff_versions`, `figma_get_changes_since_version`, `figma_generate_changelog`, `figma_blame_node` | REST version history, diffs, changelog, "binary-search blame" | |
| Cloud relay (1) | `figma_pair_plugin` | "Returns a 6-character code the user enters in the plugin" (cloud only) | |
| MCP Apps (4, gated) | `figma_browse_tokens` | "Open an interactive browser to explore design tokens" (ext-apps UI) | |
| | `token_browser_refresh` | "Refresh token data (called from MCP App UI)" | |
| | `figma_audit_design_system` | Scored DS-health dashboard rendered as an MCP App | |
| | `ds_dashboard_refresh` | "Refresh dashboard data (called from MCP App UI)" | |

- The MCP Apps are built with `@modelcontextprotocol/ext-apps` ("rich interactive UI experiences that render directly inside any MCP client that supports the MCP Apps protocol extension"). They are enabled with `"ENABLE_MCP_APPS": "true"` and labeled "experimental". The roadmap lists Component Gallery, Style Inspector and Variable Diff Viewer apps — [README §MCP Apps](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- The docs position tool design as "107 purpose-built tools, each with its own schema" in contrast to Figma's single `use_figma` — [docs/figma-mcp-vs-figma-console-mcp.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/figma-mcp-vs-figma-console-mcp.md)

### Inferences
- For an AG-UI-driven loop, the useful write primitives already exist as schema-validated tools: `figma_search_components` → `figma_instantiate_component` → `figma_set_instance_properties` / `figma_append_to_slot` → `figma_capture_screenshot`. A renderer that turns a declarative UI tree into Figma instances could be built mostly from these commands (or from their `code.js` handlers) without falling back to `figma_execute`.
- The `figma_ds_*` → `figma_import_tokens` pipeline (code → DTCG → Figma variables) and `figma_check_design_parity` are the pieces that make it a *loop*, not just code → canvas.

### Gaps
- The exact 101-tool Cloud Mode set was not recomputed from source (it would require resolving which `local.ts`-only tools the Worker omits). The figure is as documented.
- I did not confirm whether `figma_audit_component_accessibility`'s color-blind simulation creates temporary nodes. No `clone()` or `createFrame` call was found in its handler, but it may run code through the bridge.

---

## 3. Is anything event-driven? (selection, document changes, console, subscriptions)

### Takeaway
Yes on the plugin → server leg: the Desktop Bridge **pushes** unsolicited `SELECTION_CHANGE`, `DOCUMENT_CHANGE`, `METADATA_CHANGE`, `PAGE_CHANGE` and `CONSOLE_CAPTURE` messages over the WebSocket, and the server re-emits them as Node `EventEmitter` events. No on the server → MCP client leg: the events are buffered in memory and read back with pull tools (`figma_get_selection`, `figma_get_design_changes`, `figma_get_console_logs`), or with `figma_watch_console`, which sleeps for N seconds and then returns. The code has no MCP notifications, resource subscriptions or streamed tool output. Real-time monitoring is Local-only; Cloud Mode lacks it.

### Cited Findings
- Plugin main thread listeners are registered after `figma.loadAllPagesAsync()`: `figma.on('documentchange', …)` posts `DOCUMENT_CHANGE` `{hasStyleChanges, hasNodeChanges, changedNodeIds (≤50), changeCount, timestamp}` and `METADATA_CHANGE` (new values of `description`/`annotations` only). `figma.on('selectionchange', …)` posts `SELECTION_CHANGE` `{nodes: [{id,name,type,width,height}] (≤50), count, page, timestamp}`. `figma.on('currentpagechange', …)` posts `PAGE_CHANGE` — [code.js#L7223-L7350](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js#L7223-L7350)
- Console capture: the plugin overrides `console.*` in the QuickJS sandbox and posts `CONSOLE_CAPTURE` `{level, message, args, timestamp}` — [code.js#L19-L70](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js#L19-L70); [CHANGELOG 1.8.0](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/CHANGELOG.md)
- Server side: "Unsolicited data from plugin (FILE_INFO, events, forwarded data)" is dispatched to `this.emit('documentChange' | 'metadataChange' | 'selectionChange' | 'pageChange' | 'consoleLog' | 'pluginMessage' | 'fileConnected' | 'fileDisconnected' | 'activeFileChanged')`. Buffers: `consoleBufferSize = 1000`, `documentChangeBufferSize = 200`, per file — [src/core/websocket-server.ts#L490-L590](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L490-L590)
- The only in-server consumers of these events are logging and **cache invalidation** ("Invalidate variable cache when document changes are reported") — [src/local.ts#L3963-L4010](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts#L3963-L4010)
- `figma_watch_console` implementation: `await new Promise((resolve) => setTimeout(resolve, duration * 1000))`, then it returns the logs captured since the start — [src/local.ts#L797](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts#L797)
- `figma_get_design_changes` returns "buffered change events… Use this to understand what changed since you last checked" — [src/local.ts#L1631](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/local.ts#L1631)
- A grep for `sendLoggingMessage`, `sendResourceUpdated`, `resources/updated` and `notifications/` across `src/local.ts` and `src/core/*.ts` returns no hits (my search of the pinned commit) — [src/](https://github.com/southleft/figma-console-mcp/tree/db1967f479514710acc64be4c527ac033410b772/src)
- The docs describe the WebSocket transport as supporting "real-time selection tracking, document change monitoring, and console capture", and say "Every server instance receives real-time events (selection changes, document changes, console logs)" — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md); [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- Cloud Mode: "Only real-time monitoring (console logs, selection tracking, document changes) requires Local Mode" — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- A search of the repo's issues for "ag-ui" returns "No results". A semantic GitHub issue search for push/subscription/notification requests returned 0 items — [issues?q=ag-ui](https://github.com/southleft/figma-console-mcp/issues?q=ag-ui)

### Inferences
- The event source an AG-UI stream would need already exists inside the Node process as an `EventEmitter`. Adding an SSE route or AG-UI emitter next to `/health` would be a small code change. The WebSocket server's HTTP handler currently 404s everything except `/health`.
- The payloads are coarse, though. Document changes carry node ids (capped at 50) and counts, not property deltas. To produce AG-UI `STATE_DELTA` (JSON Patch) you would have to re-read the changed nodes (via the bridge) and diff them against the last snapshot.

### Gaps
- It is unclear whether Southleft plans MCP notifications or resource subscriptions. No roadmap item or issue was found.

---

## 4. Southleft's own writing, and Story UI

### Takeaway
Southleft (TJ Pitre) writes steadily about AI and design systems: Figma Console MCP (Jan and Mar 2026), A2UI (Jan 2026), "AI proposes, the design system disposes" (Jul 2026), FigmaLint (Jul 2025) and Story UI (Jun 2025). **Story UI** (`southleft/story-ui`, npm `@tpitre/story-ui` 5.21.2, 2026-09-25) is a Storybook-embedded generator. An Express server writes real `.stories.tsx` files from prompts using the project's discovered components, verifies them in Playwright plus a vision model, and streams progress to its UI over its own **SSE event protocol**. It also exposes 8 MCP tools over stdio and Streamable HTTP. It has no Figma Console MCP integration. Southleft also has A2UI renderers (`a2ui-bridge`, `local-generative-ui-demo`) and a "Design System Contracts" POC that drives Figma writes through Figma Console MCP.

### Cited Findings

**Southleft writing**
- "Figma Console MCP: AI-Powered Design System Management…" (TJ Pitre, 2026-01-14). It describes Remote Mode ("Connect via SSE with OAuth authentication") and Local Mode via the Desktop Bridge — [southleft.com](https://southleft.com/insights/ai/figma-console-mcp-ai-powered-design-system-management)
- "Figma MCP vs. Figma Console MCP" (TJ Pitre, 2026-03-08): "The official MCP gives you a window into your designs. Figma Console MCP gives you the keys to the building." (Tool counts in it are stale, 57+ vs 13.) — [southleft.com](https://southleft.com/insights/ai/figma-mcp-vs-figma-console-mcp)
- The repo's current comparison doc (updated 2026-08-16) says "The Figma MCP is a task-driven agent tool optimized for code-to-canvas workflows. Figma Console MCP is a design system ecosystem tool". It credits Figma MCP with Code Connect, `generate_figma_design`, `generate_diagram` and `create_new_file`, which Console MCP lacks — [docs/figma-mcp-vs-figma-console-mcp.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/figma-mcp-vs-figma-console-mcp.md)
- "A2UI: How AI Agents Build Real User Interfaces" (TJ Pitre, 2026-01-07): "The AI doesn't generate code. Instead, it generates a recipe: a structured JSON description of what UI elements should appear." It introduces **A2UI Bridge**, a React implementation with Mantine and ShadCN adapters. It does not connect A2UI to Figma or Storybook — [southleft.com](https://southleft.com/insights/ai/a2ui-how-ai-agents-build-real-user-interfaces)
- "AI proposes, the design system disposes" (TJ, 2026-07-23): "AI is only as good as the structured context it can reach". Claude returns theme decisions as JSON parameters, and an OKLCH color engine enforces WCAG AA. `/tokens.json` is "generated at build time from the stylesheet the site runs on". It mentions building "an MCP server that gives agents real access to Figma" — [southleft.substack.com](https://southleft.substack.com/p/ai-proposes-the-design-system-disposes)
- FigmaLint (TJ Pitre, 2025-07-02; older): an AI-assisted Figma plugin that audits components for tokens, properties and accessibility, with built-in chat. It is in beta on Community (plugin id 1521241390290871981) and draws on Southleft's "Design Systems MCP" knowledge base — [southleft.com](https://southleft.com/insights/design-systems/designing-for-developers-introducing-figmalint)

**Story UI**
- Repo and version: `github.com/southleft/story-ui`, `"name": "@tpitre/story-ui"`, `"version": "5.21.2"`, "AI-powered Storybook story generator with dynamic component discovery". It exports a panel, a workspace and a Storybook manager bundle — [package.json](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/package.json); [CHANGELOG 5.21.2 (2026-09-25)](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/CHANGELOG.md)
- What it does: "Design screens in your own design system, by describing them… it writes a real Storybook story using the components your team actually ships… It is a file in your repository." Components are "discovered from your project: the package's type declarations, your local source, and Storybook's own index". "Every prop is checked against that component's real type" — [README](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/README.md)
- Requirements: Storybook 10+, Node 20+, a React + TypeScript design system, an Anthropic, OpenAI or Gemini API key, and optionally Playwright. Vue, Svelte, Lit and Angular get the "classic panel" only — [README](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/README.md)
- UX: the workspace (`?path=/workspace/`) streams "the plan… then the code, then the story appears in the preview the moment the file is written". It has a click-to-edit inspector ("No model involved: the inspector reads that component's real props and rewrites one attribute instantly"), diffs, version history, and a handoff that "commits the story to a new git branch and can open a pull request" — [README](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/README.md)
- Verification: static checks cover imports, props against computed TS types, `var(--token)` must exist, and the spacing scale, with "up to three correction attempts". It then renders in a real browser and runs Render, Looks broken, Layout, DOM census, Interaction, Accessibility (axe) and Visual review (a vision model: "is this shippable?"). A failing story is regenerated up to 3 times, and a badge shows "Verified · 7/7 checks" — [README](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/README.md)
- Architecture: an Express server (`mcp-server/index.ts`) with routes including `POST /mcp/generate-story`, `POST /mcp/generate-story-stream`, `/story-ui/generate-stream`, `/mcp/edit-prop`, the canvas and voice routes, `/story-ui/versions/*` and `/story-ui/handoff/*` — [mcp-server/index.ts](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/mcp-server/index.ts)
- **Its own SSE event protocol:** `streamTypes.ts` — "event structure for Server-Sent Events (SSE) that enable real-time feedback during story generation". The event types are `started`, `preview_ready`, `llm_text`, `intent`, `progress`, `validation`, `retry`, `completion` and `error`. `progress.phase` includes `llm_thinking`, `validating`, `saving`, `runtime_check`, `runtime_healing`, `verifying`, `verify_repairing`, `verified` and others. `completion` carries `componentsUsed`, `layoutChoices`, `styleChoices`, `suggestions`, `chatSummary`, `storybookId` and more — [mcp-server/routes/streamTypes.ts](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/mcp-server/routes/streamTypes.ts); `Content-Type: text/event-stream` is set in [generateStoryStream.ts](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/mcp-server/routes/generateStoryStream.ts)
- MCP: "The same eight tools on both transports": `test-connection`, `generate-story`, `update-story`, `list-components`, `list-stories`, `get-story`, `delete-story` and `get-component-props`. The stdio server is a thin client of the HTTP server (default port 4001). The remote transport is Streamable HTTP at `/mcp-remote/mcp`, with legacy SSE at `/mcp-remote/sse`. "Direct prop editing, version history, verification details and handoff are workspace features and are not exposed as MCP tools." — [docs/MCP_INTEGRATION.md](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/docs/MCP_INTEGRATION.md)
- Story UI can also act as an MCP *client*: "When Story UI is configured with a storybookMcpUrl, this client will automatically fetch context before story generation" (component docs, UI-building instructions, story patterns) — [story-generator/storybookMcpClient.ts](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/story-generator/storybookMcpClient.ts)
- Original framing (2025-06-19; older): "A local MCP server (Storybook is effectively acting as the code-side MCP), A Claude-powered AI agent to interpret prompts" — [southleft.com](https://southleft.com/insights/design-systems/introducing-story-ui-accelerating-layout-generation-with-ai-mcp)

**Other Southleft repos relevant to the loop**
- `southleft/a2ui-bridge`: "implements Google's A2UI Protocol for React" (`@a2ui-bridge/core`, `@a2ui-bridge/react`, `createAdapter(Button, …)`). Last commit 2026-01-12 (older) — [README](https://github.com/southleft/a2ui-bridge/blob/31ed931a0d41102cffb4f58c0316a850ce425f10/README.md)
- `southleft/local-generative-ui-demo` (last commit 2026-09-23): a 2B-parameter in-browser model (Gemma 4 E2B on WebGPU or Gemini Nano) composes UI from an "18-component design system, speaking A2UI v0.9", rendered by Google's `@a2ui/web_core` + `@a2ui/react`. A deterministic guardrail layer ("Repair → Salvage → Validate → Compile") fixes output that fails `JSON.parse` "53 times out of 65" — [README](https://github.com/southleft/local-generative-ui-demo/blob/caf16801aa2e8f918936e21c8cd7771d856492ce/README.md)
- `southleft/ds-contracts-poc` "Design System Contracts" (active 2026-09-29): "Connect your component library in code and your design library in Figma through a shared, machine-readable contract… V1 focuses on React ↔ contracts ↔ Figma". It states "No AI is required in the conversion path" and has a companion plugin fixed to `http://localhost:5181`. Its census tooling says "the figma-console bridge speaks MCP over stdio to its own client… the canvas write is an MCP-DRIVEN stage… performed by an agent holding the figma-console MCP tools" — [README](https://github.com/southleft/ds-contracts-poc/blob/4df13f6726c933c94b04a7118fe27215c69e9910/README.md); [extract/figma/census/first-pass-run.ts](https://github.com/southleft/ds-contracts-poc/blob/4df13f6726c933c94b04a7118fe27215c69e9910/extract/figma/census/first-pass-run.ts)

### Inferences
- Story UI's SSE stream is effectively a private, domain-specific version of AG-UI. `started` ≈ `RUN_STARTED`, `llm_text` ≈ `TEXT_MESSAGE_CONTENT`, `progress` ≈ `STEP_STARTED/STEP_FINISHED` (or `ACTIVITY_*`), `validation`/`retry` ≈ `CUSTOM`, `completion` ≈ `RUN_FINISHED` (+ `STATE_SNAPSHOT`), and `error` ≈ `RUN_ERROR`. That makes it the cheapest Southleft surface to put behind an AG-UI adapter.
- Southleft's generative-UI bet so far is **A2UI** (declarative JSON rendered through a component catalog), not AG-UI. The A2UI "catalog" idea maps directly onto rendering into Figma component instances. Southleft has not built that bridge; ds-contracts-poc (contract → Figma writer programs) is the nearest precedent.

### Gaps
- I did not find a specific Southleft piece titled or focused on "machine-readable design tokens". The closest are the 2026-07-23 Substack essay and ds-contracts-poc's "machine-readable contract". A Brad Frost link to Southleft's "The Value of Design Tokens in Modern Web Development" showed up in search, but I did not fetch it.
- TJ Pitre's LinkedIn posts were not fetched (not reliably indexed or fetchable).
- I did not check the FigmaLint source repo; the article gives none.

---

## 5. Does anyone connect AG-UI, CopilotKit, A2UI or MCP Apps to Figma Console MCP or Story UI?

### Takeaway
**AG-UI and CopilotKit: no mention anywhere** in Figma Console MCP, Story UI or four other Southleft repos, in their issues, or on the web. **A2UI:** Southleft writes about it and ships A2UI renderers, but never in connection with Figma Console MCP or Story UI. **MCP Apps:** Figma Console MCP itself ships two MCP Apps (Token Browser, Design System Dashboard). Separately, CopilotKit documents rendering MCP Apps inside AG-UI apps, which gives an indirect but real path from AG-UI to Figma Console MCP.

### Cited Findings
- A case-insensitive grep for `ag-ui|@ag-ui|copilotkit|agent-user interaction` over `figma-console-mcp`, `story-ui`, `a2ui-bridge`, `local-generative-ui-demo` and `ds-contracts-poc` (excluding lockfiles and `node_modules`) returned **0 files** in each. The only `a2ui` string hit in figma-console-mcp is an integrity hash in `package-lock.json` — [figma-console-mcp](https://github.com/southleft/figma-console-mcp/tree/db1967f479514710acc64be4c527ac033410b772); [story-ui](https://github.com/southleft/story-ui/tree/f960dda85257854c20fe13acc1e36c1ae3bf50de)
- GitHub issue search `ag-ui` in figma-console-mcp: "No results" — [issues?q=ag-ui](https://github.com/southleft/figma-console-mcp/issues?q=ag-ui)
- A web search for `"figma-console-mcp" AG-UI OR CopilotKit OR A2UI` returned only generic CopilotKit/A2UI pages and Figma Console MCP docs, with no page linking them — [CopilotKit MCP Apps doc](https://docs.showcase.copilotkit.ai/generative-ui/mcp-apps); [Figma Console MCP docs](https://docs.figma-console-mcp.southleft.com/introduction)
- A web search for `AG-UI protocol Figma plugin CopilotKit Figma integration` found no Figma-specific AG-UI or CopilotKit integration — [CopilotKit AG-UI doc](https://docs.copilotkit.ai/ag-ui-protocol)
- Southleft's A2UI article does not mention Figma Console MCP, Story UI, CopilotKit, MCP or MCP Apps — [southleft.com](https://southleft.com/insights/ai/a2ui-how-ai-agents-build-real-user-interfaces)
- Figma Console MCP's MCP Apps use `@modelcontextprotocol/ext-apps` — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md)
- CopilotKit: "`@ag-ui/mcp-apps-middleware` provides the `MCPAppsMiddleware`… Use `.use()` to attach the `MCPAppsMiddleware` to your `BuiltInAgent`". "when the agent calls one of these tools, CopilotKit automatically fetches and renders the UI component in the chat" — [CopilotKit docs](https://docs.showcase.copilotkit.ai/generative-ui/mcp-apps)

### Inferences
- The nearest off-the-shelf AG-UI ↔ Figma Console MCP connection is a CopilotKit app with `MCPAppsMiddleware` pointed at Figma Console MCP's Streamable HTTP `/mcp` endpoint (Cloud Mode) or at a local HTTP wrapper. `figma_browse_tokens` and `figma_audit_design_system` would then render as MCP-App iframes in the AG-UI frontend. I have not tested this. It depends on the cloud server registering the app tools (see Gaps).

### Gaps
- I did not confirm whether the **cloud** entry (`src/index.ts`) registers the MCP Apps. The `ENABLE_MCP_APPS` gating was verified in `local.ts` only.
- GitHub Discussions for figma-console-mcp returned HTTP 404 when fetched, so discussions were not searched.

---

## 6. Figma's own agent surfaces, and Plugin API constraints that decide whether a plugin can be an AG-UI client

### Takeaway
Figma's official MCP server (remote at `mcp.figma.com/mcp`, plus a desktop variant) now has **read and write** tools. `use_figma` is the general canvas writer, and `generate_figma_design`, `create_new_file`, `upload_assets` and `generate_diagram` also write. Access is limited to clients in Figma's MCP Catalog. Code Connect and Make kits cover the code side. On the plugin side, the main thread is a sandbox without browser APIs, though Figma now documents a global `fetch`. The UI iframe has full browser APIs with a `null` origin, and `networkAccess.allowedDomains` explicitly permits `http`, `https`, `ws` and `wss`. A plugin iframe can therefore host an AG-UI HTTP/SSE client and relay to the main thread by `postMessage`, exactly as the Desktop Bridge already does with WebSockets.

### Cited Findings

**Official Figma MCP server**
- Tools page (fetched 2026-09-30). Read: `download_assets`, `get_code_connect_map`, `get_code_connect_suggestions`, `get_context_for_code_connect`, `get_design_context`, `get_figjam`, `get_generative_plugin`, `get_libraries`, `get_metadata`, `get_motion_context`, `get_screenshot`, `get_shader`, `get_variable_defs`, `list_file_shaders`, `list_generative_plugins`, `list_shaders`, `search_design_system`, `whoami`. Write: `add_code_connect_map`, `create_generative_plugin`, `create_new_file`, `create_shader`, `generate_diagram`, `generate_figma_design`, `send_code_connect_mappings`, `update_generative_plugin`, `update_shader`, `upload_assets`, `use_figma` ("General-purpose tool for writing to Figma files"). Many are marked "Remote only" — [developers.figma.com tools-and-prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- Tool counts conflict across sources: 29 on the page above, "~25" in the State of AI July 2026 snapshot, and "16 tools" in Southleft's comparison doc — [State of AI platform record source](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/); [docs/figma-mcp-vs-figma-console-mcp.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/figma-mcp-vs-figma-console-mcp.md)
- The remote server is recommended ("without requiring the Figma desktop app"); a desktop server runs through the Figma desktop app "for specific organization and enterprise needs". "Only MCP clients listed in the Figma MCP Catalog can connect". No events, subscriptions or streaming are described — [developers.figma.com figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)
- State of AI record (snapshot 2026-07-28): the remote server is OAuth-based. Rate limits range from 6 calls/month on View/Collab seats to 200–600/day on Dev/Full seats. Code Connect requires an Organization or Enterprise plan and a full Design or Dev Mode seat. When MCP reaches a mapped node, it emits a synthetic `<CodeConnectSnippet>` — [developers.figma.com rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/); [Code Connect React](https://developers.figma.com/docs/code-connect/react/)
- Southleft's comparison says `use_figma` arrived with "Figma's March 2026 `use_figma` update", and that Figma MCP "uses a single server-side `use_figma` tool that handles structured operations through Figma's cloud" — [docs/figma-mcp-vs-figma-console-mcp.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/figma-mcp-vs-figma-console-mcp.md)
- Figma Make kits are "reusable collections of code, styles, and guidelines that Figma Make can use to generate apps and prototypes that match your brand". The package must be Vite-compatible and published to public npm or a Figma-maintained private registry, and guidelines can be auto-generated or hand-written. Make is for Full seats on paid plans — [help.figma.com Make kits](https://help.figma.com/hc/articles/43602872461079). The State of AI record adds "React 18" and the `guidelines/` tree — [developers.figma.com write-design-system-guidelines](https://developers.figma.com/docs/code/write-design-system-guidelines/)

**Plugin runtime constraints**
- "Plugin code runs on the main thread in a sandbox. The sandbox is a minimal JavaScript environment and does not expose browser APIs." and "Browser APIs like XMLHttpRequest, fetch, setTimeout, and the DOM are not directly available from the sandbox." "To use browser APIs… create an iframe… with figma.showUI()." "The main thread and the iframe can communicate with each other through message passing." — [How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/)
- There is now a documented global `fetch(url: string, init?: FetchOptions): Promise<FetchResponse>` ("Fetch a resource from the network") — [Global objects](https://developers.figma.com/docs/plugins/api/global-objects). "Plugin iframes have a `null` origin. This means that they will only be able to call APIs with `Access-Control-Allow-Origin: *`". The page does not address WebSockets, SSE, EventSource or streaming — [Making network requests](https://developers.figma.com/docs/plugins/making-network-requests/)
- **Conflict to note:** "How plugins run" says `fetch` is not directly available in the sandbox, while "Global objects" lists a global `fetch`. The most plausible reading (an inference) is that Figma added a proxied `fetch` to the main thread with a non-streaming `FetchResponse`, and native browser `fetch`/`EventSource`/`WebSocket` remain iframe-only.
- Manifest `networkAccess`: "http, https, ws, and wss are permitted schemes"; `*` wildcards subdomains; localhost with ports is allowed; `reasoning` is required for `*` or localhost; "The list of domains that your plugin can access is displayed on your plugin's Community page". `documentAccess: "dynamic-page"` is "required for all new plugins". `enablePrivatePluginApi` "enables API that's specific to private plugins" — [Plugin manifest](https://developers.figma.com/docs/plugins/manifest/)
- The Desktop Bridge is a live proof of these rules: `ws://localhost:9223…9232` in `allowedDomains`, a WebSocket client in `ui.html`, and a `postMessage` relay — [manifest.json](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/manifest.json); [ui.html](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/ui.html)

**AG-UI facts needed to judge fit**
- AG-UI event types: lifecycle (`RunStarted`, `RunFinished`, `RunError`, `StepStarted`, `StepFinished`); text message; tool call (`ToolCallStart/Args/End/Result/Chunk`); state (`StateSnapshot`, `StateDelta` using "JSON Patch operations (as defined in RFC 6902)", `MessagesSnapshot`); activity (`ActivitySnapshot/Delta`); `Raw` and `Custom`; reasoning; and subagent events — [docs.ag-ui.com events](https://docs.ag-ui.com/concepts/events)
- "AG-UI doesn't mandate how events are delivered, supporting various transport mechanisms including Server-Sent Events (SSE), webhooks, WebSockets, and more." `HttpAgent` POSTs `RunAgentInput` and receives streamed events over SSE or a binary protocol. "Tool definitions are passed in the `runAgent` parameters", which lets the frontend define and execute tools — [docs.ag-ui.com architecture](https://docs.ag-ui.com/concepts/architecture)

### Inferences
- **A Figma plugin can be an AG-UI client.** Put an `HttpAgent`/SSE client in the UI iframe, allowlist the agent's domain (https or wss, or localhost in dev) in `networkAccess`, have the agent server send `Access-Control-Allow-Origin: *` (null origin), and relay decoded events to the main thread with `postMessage`. Do not rely on main-thread `fetch` for streaming; Figma documents no streaming body.
- **The plugin can also supply AG-UI frontend tools.** The Desktop Bridge's command handlers (instantiate, set properties, append to slot, capture screenshot) could be declared as AG-UI frontend tools in `RunAgentInput`. The agent would then call Figma through AG-UI `TOOL_CALL_*` events instead of MCP. This inverts Figma Console MCP's current topology, in which the server commands the plugin.
- Figma's official MCP has no event surface and gates clients through its catalog. A custom AG-UI agent backend is more likely to reach Figma today through Figma Console MCP (PAT or bearer, open source) than through `mcp.figma.com`.

### Gaps
- The exact semantics of the main-thread `fetch` (streaming, CORS, whether it obeys `networkAccess`) are not documented on the pages fetched.
- I did not re-verify the desktop Figma MCP server's local URL or port from a primary page.

---

## 7. The most plausible AG-UI integration paths, with reused pieces and missing pieces

### Takeaway
From least to most new code: **(c)** an AG-UI agent that uses Figma Console MCP as its tool backend and streams AG-UI to a separate frontend works with today's pieces (optionally CopilotKit plus MCP Apps). **(b)** A Desktop Bridge fork that acts as an AG-UI client and renders `STATE_SNAPSHOT`/`STATE_DELTA` UI trees as component instances is feasible within plugin constraints, but it needs a catalog-to-component mapping and a reconciler. **(a)** Figma Console MCP exposing an AG-UI endpoint is easy on the event plumbing, but it is a category mismatch: Figma Console MCP is a tool server with no agent loop, and AG-UI describes agent runs.

### Cited Findings (the existing pieces each option would reuse)
- Event plumbing already in the Node process: `EventEmitter` events `documentChange`, `selectionChange`, `pageChange`, `metadataChange`, `consoleLog`, `fileConnected`, `fileDisconnected` and `activeFileChanged`, with per-file buffers — [websocket-server.ts](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts)
- An HTTP listener on the same port that already sends CORS `*` (today only `/health`) — [websocket-server.ts#L254](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L254)
- A cloud broker (Cloudflare Worker `McpAgent` + `PluginRelayDO`) with pairing and bearer binding — [docs/architecture.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/architecture.md)
- Canvas primitives: `figma_search_components`, `figma_get_library_component_by_key`, `figma_instantiate_component`, `figma_set_instance_properties`, the slot tools, `figma_set_text`, `figma_set_fills` (with `variableId`), `figma_create_child` and `figma_capture_screenshot` — [docs/tools.md](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/docs/tools.md)
- MCP Apps in Figma Console MCP, and CopilotKit's `MCPAppsMiddleware` for AG-UI apps — [README](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/README.md); [CopilotKit](https://docs.showcase.copilotkit.ai/generative-ui/mcp-apps)
- Story UI's SSE run protocol and its MCP tools on the code side — [streamTypes.ts](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/mcp-server/routes/streamTypes.ts); [docs/MCP_INTEGRATION.md](https://github.com/southleft/story-ui/blob/f960dda85257854c20fe13acc1e36c1ae3bf50de/docs/MCP_INTEGRATION.md)
- Figma Console MCP's `figma_execute` default plugin timeout is 5,000 ms, and bridge commands time out at 15,000 ms — [code.js#L489-L520](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js#L489-L520); [websocket-server.ts#L805](https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/websocket-server.ts#L805)

### Inferences

**(c) Agent uses Figma Console MCP as its tool backend and streams AG-UI to a separate frontend (most plausible now)**
- *Reuse:* all 121 local tools unchanged, over stdio or Cloud Mode `/mcp`. The agent framework (LangGraph, Mastra, CopilotKit `BuiltInAgent` and others) turns each MCP tool call into AG-UI `TOOL_CALL_START/ARGS/END/RESULT`. `figma_capture_screenshot` results become images in the chat. `figma_get_selection` and `figma_get_design_changes` feed `STATE_SNAPSHOT`/`STATE_DELTA` of a "Figma context" state. Story UI can sit beside it as a second MCP server for the code side (`generate-story`, `update-story`), and its SSE events can be re-emitted as AG-UI `STEP_*`/`CUSTOM`. The MCP Apps (`figma_browse_tokens`, `figma_audit_design_system`) can render through CopilotKit `MCPAppsMiddleware`.
- *Missing:* push. The agent must poll the Figma event tools between turns, because Figma Console MCP sends no MCP notifications. You also need result shaping, since tool payloads are large JSON that should be summarized into AG-UI state rather than dumped as messages, and a way to tell designer edits from agent edits in `documentchange`, because the plugin does not tag change origin. Cloud Mode loses selection and document events entirely.

**(b) The Desktop Bridge (or a fork) as an AG-UI client that renders UI-tree state as component instances**
- *Reuse:* the UI-iframe networking pattern and `networkAccess` manifest, the `postMessage` relay, the `code.js` handlers for `INSTANTIATE_COMPONENT`, `CREATE_COMPONENT_SET`, instance properties, slots, text, fills and variable binding, font pre-loading (v1.30.0), and the `figma.on('selectionchange')`/`documentchange` listeners for sending user edits back to the agent as AG-UI context or frontend-tool results.
- *Missing:* (1) an SSE/`HttpAgent` client in `ui.html`, with the agent endpoint allowlisted and serving `Access-Control-Allow-Origin: *`. (2) A UI-tree schema and **catalog map** from abstract components to Figma component keys and property names (the instance property keys carry `#nodeId` suffixes). A2UI's catalog model, or Southleft's ds-contracts "contract", is a ready vocabulary. (3) An RFC 6902 JSON-Patch applier plus a **keyed reconciler** that turns patches into minimal Figma mutations instead of re-instantiating everything. (4) Throttling and batching, because Plugin API writes are async and a streaming `STATE_DELTA` flood would compete with the 5 s/15 s timeouts. (5) Distribution: the Desktop Bridge is dev-imported and uses `enablePrivatePluginApi`, and a Community-published variant would show its network domains publicly. Note also that this inverts roles: today the Node server drives the plugin, while here the plugin would be the user-facing AG-UI frontend and the agent its backend.

**(a) Figma Console MCP exposes an AG-UI endpoint alongside MCP**
- *Reuse:* the `EventEmitter` bus and the existing HTTP listener (add an SSE route next to `/health`). The Cloudflare Worker could expose an equivalent route that fans out from the relay DO.
- *Missing:* an agent. AG-UI's contract is `RunAgentInput` → run events, and Figma Console MCP has no LLM loop, so a raw AG-UI endpoint could only emit `CUSTOM`/`RAW`/`STATE_*` "Figma context" events and could not host runs. The realistic shape of (a) is therefore "Figma Console MCP publishes a Figma event feed that an AG-UI agent subscribes to", which is closer to MCP resource subscriptions than to AG-UI. It also needs auth on the local HTTP route (today it is loopback-only with no token), richer change payloads (property-level deltas for `STATE_DELTA`), and a cloud equivalent for selection and document events, which Cloud Mode currently lacks.

**Recommendation to the reader (inference):** for a Figma<>code loop, the design-system-relevant novelty is (b), rendering an agent's declarative UI state into real Figma component instances. Southleft has built each half (A2UI catalogs and renderers; Figma Console MCP's instance and slot tools; ds-contracts' contract → Figma writer) but has not joined them, and there is no public AG-UI work in this ecosystem to build on.

### Gaps
- No one has built or benchmarked any of (a), (b) or (c) in public, so feasibility here rests on documented APIs and source reading, not demonstrations.
- Plugin API write throughput under a streaming patch load (how many instance or property mutations per second before the UI stalls) is undocumented.
- I did not verify whether AG-UI's `ActivitySnapshot/ActivityDelta` or A2UI-over-AG-UI conventions (CopilotKit supports A2UI) define a UI-tree schema suited to (b). Other researchers on AG-UI should confirm.
