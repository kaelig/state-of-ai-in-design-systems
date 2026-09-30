// Harbor AG-UI plugin, main thread. This is the template; build.mjs writes
// code.js from it by filling the four markers below with the same functions
// the Node side uses (src/figma/tree-to-figma.js and figma-to-tree.js), so the
// plugin and a figma_execute call draw identically.
//
// The main thread has no network (Figma: "Browser APIs like XMLHttpRequest,
// fetch, setTimeout, and the DOM are not directly available from the
// sandbox"), so the AG-UI client lives in ui.html and this file only executes
// what the UI sends: draw a tree, apply STATE_DELTA ops, read the selection.
// Keep to syntax the QuickJS sandbox accepts: no optional chaining, no nullish
// coalescing, no object spread (build.mjs checks).

var HARBOR = /*@HARBOR_DATA@*/ null;
var applyJsonPatch = /*@APPLY_JSON_PATCH@*/ null;
var figmaRuntime = /*@FIGMA_RUNTIME@*/ null;
var serializeFigmaNode = /*@SERIALIZE_FIGMA_NODE@*/ null;

figma.showUI(__html__, { width: 420, height: 720, themeColors: true, title: 'Harbor AG-UI' });

// Messages from the UI can arrive while a draw is still awaiting fonts or
// component imports. Run them one at a time, in order, so a patch never lands
// on a frame that is half drawn.
var queue = Promise.resolve();
function serially(task) {
  var next = queue.then(task, task);
  queue = next.then(
    function () {},
    function () {},
  );
  return next;
}

function reply(msg, body) {
  body.requestId = msg.requestId;
  figma.ui.postMessage(body);
}

function errorText(error) {
  return String(error && error.message ? error.message : error);
}

function payloadFor(msg) {
  var payload = {
    v: 1,
    op: msg.type,
    key: msg.key,
    frameName: msg.frameName,
    catalog: HARBOR.catalog,
    variables: HARBOR.variables,
    options: msg.options || {},
  };
  if (msg.type === 'draw') {
    payload.tree = msg.tree;
    payload.theme = msg.theme || {};
    if (payload.options.syncVariables === undefined) payload.options.syncVariables = true;
  } else {
    payload.ops = msg.ops;
    payload.base = msg.base || '/ui';
  }
  return payload;
}

function selectionSummary() {
  var sel = figma.currentPage.selection;
  return {
    type: 'selection-changed',
    count: sel.length,
    names: sel.slice(0, 3).map(function (n) {
      return n.name;
    }),
  };
}

async function focusFrame(frameId) {
  var node = frameId ? await figma.getNodeByIdAsync(frameId) : null;
  if (node) figma.viewport.scrollAndZoomIntoView([node]);
}

figma.ui.onmessage = function (msg) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'draw' || msg.type === 'patch') {
    return serially(async function () {
      try {
        var result = await figmaRuntime(figma, payloadFor(msg), { applyJsonPatch: applyJsonPatch });
        if (msg.focus && result.frameId) await focusFrame(result.frameId);
        reply(msg, { type: 'result', result: result });
      } catch (error) {
        reply(msg, { type: 'error', message: errorText(error) });
      }
    });
  }

  if (msg.type === 'read-selection') {
    return serially(async function () {
      var node = figma.currentPage.selection[0];
      if (!node) return reply(msg, { type: 'error', message: 'Select a frame first.' });
      try {
        reply(msg, { type: 'selection', node: await serializeFigmaNode(node, { figma: figma }) });
      } catch (error) {
        reply(msg, { type: 'error', message: errorText(error) });
      }
    });
  }

  if (msg.type === 'notify') figma.notify(String(msg.message).slice(0, 200));
  if (msg.type === 'hello') reply(msg, { type: 'hello', catalogId: HARBOR.catalogId, fileName: figma.root.name });
};

figma.on('selectionchange', function () {
  figma.ui.postMessage(selectionSummary());
});
figma.ui.postMessage(selectionSummary());
