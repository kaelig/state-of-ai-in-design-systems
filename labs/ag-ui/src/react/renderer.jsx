// Renders a UI tree with the registry. The renderer trusts nothing: an unknown
// type or a child id with no node draws a visible marker instead of throwing,
// because a partially streamed tree is the normal case, not the error case.

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { HarborTheme, registry as harborRegistry } from './components.jsx';

const Seen = createContext(/** @type {Set<string> | null} */ (null));

/**
 * @param {{
 *   tree: import('../tree/tree.js').UITree | null,
 *   registry?: Record<string, any>,
 *   theme?: { mode?: string, density?: string },
 *   animate?: boolean,
 *   empty?: any,
 *   onSelect?: (nodeId: string) => void,
 *   selected?: string | null,
 * }} props
 */
export function TreeRenderer({ tree, registry = harborRegistry, theme = {}, animate = true, empty = null, onSelect, selected }) {
  // Nodes rendered before stay still; only new ids get the enter animation.
  const seen = useRef(new Set());
  const root = tree?.root && tree.nodes?.[tree.root] ? tree.root : null;
  useEffect(() => {
    if (!tree?.nodes) seen.current = new Set();
  }, [tree]);
  return (
    <HarborTheme mode={theme.mode} density={theme.density}>
      <Seen.Provider value={animate ? seen.current : null}>
        {root ? <Node id={root} tree={tree} registry={registry} onSelect={onSelect} selected={selected} /> : empty}
      </Seen.Provider>
    </HarborTheme>
  );
}

function Node({ id, tree, registry, onSelect, selected }) {
  const seen = useContext(Seen);
  const node = tree.nodes[id];
  const isNew = seen ? !seen.has(id) : false;
  useEffect(() => {
    seen?.add(id);
  }, [seen, id]);
  if (!node) return null;
  const Component = registry[node.type];
  const className = [isNew ? 'h-enter' : '', selected === id ? 'h-selected' : ''].filter(Boolean).join(' ');
  if (!Component) {
    return (
      <div className={`h-unknown ${className}`} data-node-id={id}>
        Unknown component “{String(node.type)}”
      </div>
    );
  }
  const children = (node.children ?? []).map((c) =>
    tree.nodes[c] ? <Node key={c} id={c} tree={tree} registry={registry} onSelect={onSelect} selected={selected} /> : null,
  );
  const element = (
    <Component {...(node.props ?? {})} className={className}>
      {children.length ? children : undefined}
    </Component>
  );
  if (!onSelect) return element;
  // Bubble phase, so the innermost node under the pointer wins; in the capture
  // phase the root's wrapper would run first and swallow it. preventDefault
  // keeps canvas buttons and checkboxes inert while picking.
  return (
    <div
      data-node-id={id}
      style={{ display: 'contents' }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect(id);
      }}
    >
      {element}
    </div>
  );
}

/**
 * Subscribe a component to a session (src/agent/session.js).
 * @param {import('../agent/session.js').Session} session
 */
export function useSession(session) {
  const snapshot = useSyncExternalStore(
    (fn) => session.subscribe(fn),
    () => session.snapshot,
  );
  return useMemo(() => ({ ...snapshot, tree: session.currentTree(), theme: session.currentTheme() }), [snapshot, session]);
}
