// A deterministic planner. It stands in for a model so every prototype runs
// offline, in a browser, in CI and inside Storybook without an API key. It maps
// a prompt to a Harbor tree by keyword; the Claude planner in claude-agent.js
// replaces it when a key is present, and both feed the same event stream.

/**
 * @typedef {import('../tree/tree.js').UITree} UITree
 * @typedef {import('../tree/tree.js').UINode} UINode
 */

/** Build a tree from nested [type, props, children] triples, numbering ids n1, n2… */
function build(/** @type {string} */ title, /** @type {any} */ spec) {
  /** @type {Record<string, UINode>} */
  const nodes = {};
  let next = 1;
  const add = (/** @type {any} */ [type, props = {}, children]) => {
    const id = `n${next++}`;
    /** @type {UINode} */
    const node = { type, props: Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) };
    nodes[id] = node;
    if (children) node.children = children.map(add);
    return id;
  };
  const root = add(spec);
  return /** @type {UITree} */ ({ title, root, nodes });
}

/** A quoted phrase in the prompt, used as the screen's headline if present. */
const quoted = (/** @type {string} */ p) => p.match(/["“']([^"”']{3,60})["”']/)?.[1];

/** "4 metrics", "three plans" -> 4, 3 */
function count(/** @type {string} */ p, /** @type {number} */ fallback, /** @type {number} */ max) {
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const m = p.match(/\b(\d+|one|two|three|four|five|six)\s+(?:metrics?|stats?|kpis?|plans?|tiers?|cards?|tiles?)/i);
  if (!m) return fallback;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : words[/** @type {keyof typeof words} */ (m[1].toLowerCase())];
  return Math.max(1, Math.min(max, n));
}

const METRICS = [
  ['Active users', '12,480', '+8.2%', 'up'],
  ['Conversion', '3.9%', '+0.4pt', 'up'],
  ['Churn', '1.2%', '-0.3pt', 'down'],
  ['Revenue', '$84.2k', '+12%', 'up'],
  ['Tickets open', '37', '0', 'flat'],
  ['NPS', '46', '+3', 'up'],
];

const PLANS = [
  ['Starter', '$0', 'For trying Harbor on a side project.', 'Start free', 'secondary'],
  ['Team', '$24', 'Per seat, per month. Shared libraries and review.', 'Choose Team', 'primary'],
  ['Enterprise', 'Custom', 'SSO, audit logs and a named contact.', 'Talk to sales', 'secondary'],
  ['Studio', '$12', 'For freelancers with a few clients.', 'Choose Studio', 'secondary'],
];

/** @type {{ name: string, match: RegExp, build: (prompt: string) => UITree }[]} */
export const RECIPES = [
  {
    name: 'sign-up form',
    match: /sign[\s-]?up|register|create (an )?account|log[\s-]?in|sign[\s-]?in|form/i,
    build: (p) => {
      const login = /log[\s-]?in|sign[\s-]?in/i.test(p) && !/sign[\s-]?up/i.test(p);
      return build(login ? 'Sign in' : 'Sign-up form', [
        'Card',
        { padding: 'xl', elevation: 'raised' },
        [
          [
            'Stack',
            { gap: 'lg' },
            [
              ['Heading', { text: quoted(p) ?? (login ? 'Welcome back' : 'Create your account'), level: 1 }],
              ['Text', { text: login ? 'Sign in to pick up where you left off.' : 'Start a 14-day trial. No card needed.', tone: 'muted' }],
              ...(login ? [] : [['TextField', { label: 'Full name', placeholder: 'Ada Lovelace', required: true }]]),
              ['TextField', { label: 'Work email', type: 'email', placeholder: 'ada@example.com', required: true }],
              ['TextField', { label: 'Password', type: 'password', hint: login ? undefined : 'At least 12 characters.', required: true }],
              ...(login ? [] : [['Checkbox', { label: 'Email me product updates' }]]),
              ['Button', { label: login ? 'Sign in' : 'Create account', fullWidth: true }],
              ['Button', { label: login ? 'Forgot password?' : 'I already have an account', variant: 'ghost', fullWidth: true }],
            ],
          ],
        ],
      ]);
    },
  },
  {
    name: 'dashboard',
    match: /dashboard|metrics?|analytics|kpi|stats|overview|report/i,
    build: (p) => {
      const n = count(p, 4, 6);
      return build('Dashboard', [
        'Stack',
        { gap: 'xl', padding: 'xl' },
        [
          [
            'Stack',
            { direction: 'horizontal', justify: 'space-between', align: 'center' },
            [
              ['Heading', { text: quoted(p) ?? 'This week', level: 1 }],
              ['Button', { label: 'Export', variant: 'secondary', size: 'sm' }],
            ],
          ],
          ['Grid', { columns: Math.min(n, 4), gap: 'lg' }, METRICS.slice(0, n).map(([label, value, change, trend]) => ['Card', { padding: 'lg' }, [['Stat', { label, value, change, trend }]]])],
          ['Alert', { title: 'Churn is down', text: 'Three accounts renewed early after the pricing change.', tone: 'success' }],
        ],
      ]);
    },
  },
  {
    name: 'pricing',
    match: /pricing|plans?|tiers?|subscription/i,
    build: (p) => {
      const n = count(p, 3, 4);
      return build('Pricing', [
        'Stack',
        { gap: 'xl', padding: 'xl', align: 'center' },
        [
          ['Heading', { text: quoted(p) ?? 'Pick a plan', level: 1 }],
          ['Text', { text: 'Every plan includes the full component library.', tone: 'muted' }],
          [
            'Grid',
            { columns: Math.min(n, 4), gap: 'lg' },
            PLANS.slice(0, n).map(([name, price, blurb, cta, variant]) => [
              'Card',
              { padding: 'xl', elevation: variant === 'primary' ? 'raised' : 'flat' },
              [
                [
                  'Stack',
                  { gap: 'md' },
                  [
                    ...(variant === 'primary' ? [['Badge', { label: 'Most popular', tone: 'accent' }]] : []),
                    ['Heading', { text: name, level: 2 }],
                    ['Stat', { label: 'per month', value: price }],
                    ['Text', { text: blurb, tone: 'muted', size: 'sm' }],
                    ['Button', { label: cta, variant, fullWidth: true }],
                  ],
                ],
              ],
            ]),
          ],
        ],
      ]);
    },
  },
  {
    name: 'settings',
    match: /settings|profile|account|preferences/i,
    build: (p) =>
      build('Profile settings', [
        'Stack',
        { gap: 'xl', padding: 'xl' },
        [
          ['Heading', { text: quoted(p) ?? 'Profile', level: 1 }],
          [
            'Card',
            { padding: 'lg' },
            [
              [
                'Stack',
                { gap: 'lg' },
                [
                  ['Stack', { direction: 'horizontal', gap: 'md', align: 'center' }, [['Avatar', { name: 'Ada Lovelace', size: 'lg' }], ['Stack', { gap: 'xs' }, [['Text', { text: 'Ada Lovelace' }], ['Badge', { label: 'Admin', tone: 'accent' }]]]]],
                  ['Divider', {}],
                  ['TextField', { label: 'Display name', placeholder: 'Ada' }],
                  ['TextField', { label: 'Email', type: 'email', placeholder: 'ada@example.com' }],
                  ['Checkbox', { label: 'Send me a weekly digest', checked: true }],
                  ['Stack', { direction: 'horizontal', gap: 'sm', justify: 'end' }, [['Button', { label: 'Cancel', variant: 'ghost' }], ['Button', { label: 'Save changes' }]]],
                ],
              ],
            ],
          ],
          ['Alert', { title: 'Danger zone', text: 'Deleting your account removes every file you own.', tone: 'danger' }],
        ],
      ]),
  },
  {
    name: 'empty state',
    match: /empty|onboarding|welcome|get(ting)? started|zero/i,
    build: (p) =>
      build('Empty state', [
        'Stack',
        { gap: 'lg', padding: '2xl', align: 'center' },
        [
          ['Badge', { label: 'New', tone: 'accent' }],
          ['Heading', { text: quoted(p) ?? 'No projects yet', level: 1 }],
          ['Text', { text: 'Projects hold your screens, components and review threads.', tone: 'muted' }],
          ['Stack', { direction: 'horizontal', gap: 'sm' }, [['Button', { label: 'New project' }], ['Button', { label: 'Import from Figma', variant: 'secondary' }]]],
        ],
      ]),
  },
];

/** The fallback: a card that restates the request, so no prompt yields nothing. */
const fallback = (/** @type {string} */ p) =>
  build('Card', [
    'Card',
    { padding: 'xl' },
    [
      [
        'Stack',
        { gap: 'md' },
        [
          ['Heading', { text: quoted(p) ?? (p.trim().slice(0, 60) || 'Untitled'), level: 1 }],
          ['Text', { text: 'The offline planner knows sign-up forms, dashboards, pricing, settings and empty states. Connect a model for anything else.', tone: 'muted' }],
          ['Button', { label: 'Continue' }],
        ],
      ],
    ],
  ]);

/**
 * @param {string} prompt
 * @returns {{ recipe: string, tree: UITree }}
 */
export function plan(prompt) {
  const recipe = RECIPES.find((r) => r.match.test(prompt));
  return recipe ? { recipe: recipe.name, tree: recipe.build(prompt) } : { recipe: 'fallback', tree: fallback(prompt) };
}

/**
 * Theme changes a follow-up prompt can ask for without rebuilding the screen.
 * @param {string} prompt
 * @returns {Record<string, string>}
 */
export function themeIntent(prompt) {
  /** @type {Record<string, string>} */
  const out = {};
  if (/\bdark\b/i.test(prompt)) out.mode = 'dark';
  if (/\blight\b/i.test(prompt)) out.mode = 'light';
  if (/\b(compact|dense|tight)\b/i.test(prompt)) out.density = 'compact';
  if (/\b(comfortable|roomy|spacious)\b/i.test(prompt)) out.density = 'comfortable';
  return out;
}

/**
 * Introduce one contract violation so the validate-and-repair loop has
 * something to catch. Real models do this unprompted; the demo needs it on cue.
 * @param {UITree} tree
 * @returns {{ tree: UITree, mistake: string }}
 */
export function injectMistake(tree) {
  const copy = structuredClone(tree);
  const button = Object.entries(copy.nodes).find(([, n]) => n.type === 'Button');
  if (button) {
    button[1].props = { ...button[1].props, variant: 'danger' };
    return { tree: copy, mistake: `Button ${button[0]} uses variant "danger", which Harbor does not have.` };
  }
  const first = Object.keys(copy.nodes)[0];
  copy.nodes[first] = { ...copy.nodes[first], type: 'Container' };
  return { tree: copy, mistake: `Node ${first} is a "Container", which Harbor does not have.` };
}

/**
 * Undo what injectMistake did, the way a model would after reading the
 * validation errors: set the offending value back to one the catalog allows.
 * @param {UITree} tree
 * @param {import('../tree/tree.js').Finding[]} errors
 * @param {import('../catalog/index.js').Catalog} catalog
 */
export function repair(tree, errors, catalog) {
  const copy = structuredClone(tree);
  for (const e of errors) {
    const node = e.nodeId ? copy.nodes[e.nodeId] : undefined;
    if (!node) continue;
    if (e.rule === 'catalog') node.type = 'Stack';
    if (e.rule === 'props') {
      const prop = e.path.split('/props/')[1]?.split('/')[0];
      const schema = prop ? catalog.components[node.type]?.props?.properties?.[prop] : undefined;
      if (prop && schema && 'default' in schema) node.props = { ...node.props, [prop]: schema.default };
      else if (prop) {
        const { [prop]: _drop, ...rest } = node.props;
        node.props = rest;
      }
    }
  }
  return copy;
}
