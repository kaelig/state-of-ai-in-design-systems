# Harbor AG-UI, a Figma development plugin

A Figma plugin that is an AG-UI client. It talks to the lab's design agent
(`npm run agent`), draws what the agent builds into the open file as it
streams, stops for design review, and answers the agent's `draw_in_figma`
frontend tool. It can also follow a run someone started elsewhere, such as
Storybook, and send a selected frame back to the agent as a Harbor UI tree.

## Load it

1. Build the plugin files and start the agent:

   ```sh
   cd labs/ag-ui
   node figma-plugin/build.mjs      # writes figma-plugin/code.js and figma-plugin/ui.html
   npm run agent                    # http://localhost:8787
   ```

2. In the Figma desktop app, open a design file, then choose
   **Plugins > Development > Import plugin from manifest…** and pick
   `labs/ag-ui/figma-plugin/manifest.json`.
3. Run it from **Plugins > Development > Harbor AG-UI**.

Figma caches a development plugin's files. After you rebuild, close and rerun
the plugin; if it still runs old code, import the manifest again.

## Use it

- **Generate.** Type a prompt and press Generate. The plugin posts a
  `RunAgentInput` to `POST /agent` with the catalog's tools plus
  `draw_in_figma`, and draws the screen while `STATE_SNAPSHOT` and
  `STATE_DELTA` events arrive: one draw, then small patches.
- **Review.** The run ends with a `design_review` interrupt. Approve resumes
  the thread; the agent then calls `draw_in_figma`, the plugin draws the
  final frame and answers with a tool message, and the agent acknowledges it.
  Reject sends your notes instead.
- **Follow a thread.** Paste a thread id from another client and press
  Follow. The plugin reads `GET /threads/:id/events`, which starts with the
  thread's current state, and draws along. It does not answer that run's
  tools or interrupts; the client that started the run does.
- **Send selection to agent.** Select a frame and press the button. The main
  thread serializes it, the UI maps it onto the Harbor catalog, logs any
  findings (layers with no Harbor equivalent, unknown variant values), and
  starts a run with the tree in `state.ui` and the message "Build this in code".

Each thread draws into one top-level frame, found again by its thread id, so
live drawing and `draw_in_figma` update the same frame.

## What gets drawn

- **Variables.** Harbor's tokens become two collections, "Harbor palette" and
  "Harbor" (semantic, aliasing the palette, with Light and Dark modes). They
  are looked up by name first, so a second run creates nothing. A file on a
  plan that allows one mode per collection gets no Dark mode, and the plugin
  says so.
- **Components.** A leaf with `figma.key` in the catalog is imported from the
  library. Without a key, the plugin looks for a local component or component
  set named like `figma.component`. Props are set through the catalog's
  `figma.properties`; names match without the `#id` suffix, and variant
  values match case-insensitively.
- **Primitives.** Anything else is drawn as auto-layout frames and text bound
  to Harbor variables. Stack, Grid and Card are always frames, because a
  component instance cannot hold arbitrary children. Text uses Inter.
- **Identity.** Every layer is named `Type · nodeId` and carries
  `{ nodeId, type, props }` in shared plugin data (namespace `agui`, key
  `node`), readable by any plugin, including Figma Console MCP's Desktop
  Bridge. The frame stores the whole tree (key `tree`), so a patch knows what
  it is patching.

## Files

| Path | What it is |
| --- | --- |
| `manifest.json` | Plugin manifest: `documentAccess: dynamic-page`, localhost:8787 allowed |
| `src/main.js` | Main-thread template: runs draw, patch and read requests one at a time |
| `src/ui.html` | UI template: the AG-UI client (fetch and a small SSE reader, no dependencies) |
| `build.mjs` | Fills the templates from `src/figma/sandbox.js`, `src/figma/figma-to-tree.js` and the catalog |
| `code.js`, `ui.html` | Generated. Do not edit |

The drawing code is shared with `src/figma/figma-console-mcp.js`, which sends
the same program to Figma Console MCP's `figma_execute`.

## Not verified in Figma

The tests run every script against a strict mock of the Plugin API, not
against Figma. Layout details (how stretch and wrap resolve, text wrapping),
component imports from a real library, and the plugin's network access from a
real plugin iframe have not been checked in the Figma desktop app.
