// Turns the AG-UI message list into rows for the thread view. The thread shows
// what a chat UI would (user and assistant text) and also the protocol objects
// a chat UI usually hides: tool calls, the tool results this page sent back,
// and activity messages.

/**
 * @typedef {(
 *   | { kind: 'user', id: string, text: string }
 *   | { kind: 'assistant', id: string, text: string }
 *   | { kind: 'tool-call', id: string, name: string, toolCallId: string, size: number }
 *   | { kind: 'tool-result', id: string, name: string, toolCallId: string, summary: string, ok: boolean }
 *   | { kind: 'activity', id: string, activityType: string }
 * )} ThreadItem
 */

/**
 * @param {any[]} messages AG-UI messages, as the session snapshot holds them
 * @returns {ThreadItem[]}
 */
export function threadItems(messages = []) {
  /** @type {Map<string, string>} */
  const callNames = new Map();
  /** @type {ThreadItem[]} */
  const items = [];
  for (const m of messages) {
    if (!m) continue;
    if (m.role === 'user') {
      items.push({ kind: 'user', id: m.id, text: contentText(m.content) });
    } else if (m.role === 'assistant') {
      const text = contentText(m.content);
      if (text) items.push({ kind: 'assistant', id: m.id, text });
      for (const call of m.toolCalls ?? []) {
        callNames.set(call.id, call.function?.name ?? 'tool');
        items.push({ kind: 'tool-call', id: `${m.id}:${call.id}`, name: call.function?.name ?? 'tool', toolCallId: call.id, size: String(call.function?.arguments ?? '').length });
      }
    } else if (m.role === 'tool') {
      const name = callNames.get(m.toolCallId) ?? 'tool';
      const { summary, ok } = toolResultSummary(name, m.content);
      items.push({ kind: 'tool-result', id: m.id, name, toolCallId: m.toolCallId, summary, ok });
    } else if (m.role === 'activity') {
      items.push({ kind: 'activity', id: m.id, activityType: m.activityType ?? 'activity' });
    }
  }
  return items;
}

/** @param {unknown} content string or AG-UI content parts */
function contentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (p && typeof p === 'object' && 'text' in p ? String(p.text) : '')).join('');
  return '';
}

/**
 * One line describing what this page answered a frontend tool call with.
 * @param {string} name tool name
 * @param {unknown} content the tool message content (JSON text)
 * @returns {{ summary: string, ok: boolean }}
 */
export function toolResultSummary(name, content) {
  /** @type {any} */
  let result;
  try {
    result = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    return { summary: String(content ?? '').slice(0, 80), ok: true };
  }
  if (result && typeof result === 'object' && 'error' in result && result.error) return { summary: `failed: ${result.error}`, ok: false };
  if (name === 'render_ui' && result && typeof result === 'object' && 'valid' in result) {
    const errors = result.errors?.length ?? 0;
    const warnings = result.warnings?.length ?? 0;
    if (errors) return { summary: `rejected: ${errors} contract error${errors > 1 ? 's' : ''}`, ok: false };
    return { summary: warnings ? `valid, ${warnings} guideline warning${warnings > 1 ? 's' : ''}` : 'valid', ok: true };
  }
  if (result && typeof result === 'object' && typeof result.message === 'string') return { summary: result.message, ok: true };
  return { summary: 'answered', ok: true };
}
