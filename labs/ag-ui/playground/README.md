# Harbor AG-UI playground

A single page where an agent builds screens using only Harbor components, and every step of the AG-UI protocol stays visible. The page has three panes:

- **Composer:** the prompt, example chips, and the delivery mode (Shared state, Frontend tool, Activity message, A2UI surface), each with the events it uses. It also has two switches, "Plant a contract error" and "Ask for review", and the thread. The thread shows the agent's streamed text plus the tool calls, tool results and activity messages a chat UI would hide. **Agent** at the bottom switches between the in-page `DesignAgent` and an `HttpAgent` pointed at the lab's server.
- **Canvas:** the live tree drawn by Harbor's React components, at Fit, Desktop (1280), Tablet (768) or Phone (390) width. The theme comes from `session.currentTheme()`. The review interrupt shows as a banner with Approve and Request changes. Contract checks list every validation of the turn, errors and guideline warnings apart. Click a finding or a component to highlight it and see its props.
- **Inspector:**
  - Events: every AG-UI event, grouped by run and filterable by family. Click a row for the raw JSON.
  - State: shared state, plus the content of each activity message.
  - Contract: `RunAgentInput.tools` (the `render_ui` schema), `RunAgentInput.context`, `catalogToA2ui(harbor)`, and the full last input as a middleware captured it.
  - Code: JSX and CSF 3 from the current tree. It flags when the agent called `export_code`.
  - Figma: the `figma_execute` payload `{ code }` from `src/figma/tree-to-figma.js`.

The page builds on `src/agent/session.js`; it adds no second copy of the protocol loop. It offers one frontend tool besides `render_ui`: `export_code`, whose handler returns `treeToJsx(tree)`.

## Commands

Run these from `labs/ag-ui`:

```sh
npx vite playground              # dev server with hot reload
npx vite build playground        # writes playground/dist/index.html, one self-contained file
node --test tests/playground.test.js
npm run agent                    # optional: the SSE server for the "Agent server" transport
```

The build inlines every script and stylesheet into `dist/index.html`. The only external request is the IBM Plex stylesheet from Google Fonts, and the page falls back to system fonts without it. The default transport is the in-page agent, so the file works from `file://` or as a hosted page with no server. A hosted copy cannot reach `localhost`, so the server transport only works when you run the page locally.

## Build notes

`vite.config.js` holds two small plugins instead of dependencies:

- `singleFile` inlines the bundle into the HTML after Rolldown writes it, with code splitting turned off.
- `precompiledAjv` replaces the `ajv` import in `src/tree/tree.js` with validators generated at build time from `harbor.catalog.json`, using Ajv's standalone mode. Ajv normally compiles with `new Function`, which a page served without `'unsafe-eval'` in its Content-Security-Policy refuses. Rebuild after changing the catalog.

The minifier is held to ES2017 syntax. `tree-to-figma.js` ships its Figma runtime as function source text, and the default compressor rewrites `catch (e) {}` to `catch {}`, which Figma's plugin sandbox rejects.

The Figma tab finds the exporter with `import.meta.glob`, so the page still builds without `src/figma/tree-to-figma.js`. In that case the tab says the exporter is missing.
