// A hand-written stand-in for the Figma Plugin API, enough of it to run the
// scripts tree-to-figma.js generates. It is strict where Figma is strict and a
// silent failure would hide a bug:
//
//   - text writes throw unless the font was loaded with loadFontAsync
//   - layoutAlign / layoutGrow / layoutSizing* throw outside an auto-layout parent
//   - reading componentPropertyDefinitions on a variant throws
//   - InstanceNode.mainComponent throws (documentAccess: "dynamic-page");
//     getMainComponentAsync works
//   - figma.root.findAllWithCriteria throws before loadAllPagesAsync
//   - setProperties throws on an unknown property or variant value
//   - collection.addMode throws past the plan's mode limit
//
// It is not a layout engine: sizes are whatever the code set.

const MIXED = Symbol('figma.mixed');

/**
 * @param {{
 *   localComponents?: MockComponentSpec[],
 *   libraryComponents?: MockComponentSpec[],
 *   fonts?: string[],
 *   modeLimit?: number,
 * }} [options]
 * @typedef {{ name: string, key?: string, variants?: Record<string, string[]>, text?: Record<string, string>, booleans?: Record<string, boolean>, set?: boolean }} MockComponentSpec
 */
export function createFigmaMock(options = {}) {
  const { fonts = ['Inter/Regular', 'Inter/Medium', 'Inter/Bold'], modeLimit = 4 } = options;
  let nextId = 1;
  const newId = () => `${nextId++}:${nextId % 7}`;
  const loadedFonts = new Set();
  const byId = new Map();
  let pagesLoaded = false;
  const calls = { setProperties: 0, importByKey: 0, createInstance: 0, loadAllPages: 0 };

  const requireFont = (/** @type {any} */ f) => {
    if (!f || !loadedFonts.has(`${f.family}/${f.style}`)) throw new Error(`Cannot write to node with unloaded font "${f?.family} ${f?.style}"`);
  };

  class Node {
    /** @param {string} type */
    constructor(type) {
      this.id = newId();
      this.type = type;
      this.name = type;
      this.parent = null;
      this.removed = false;
      this.visible = true;
      this.x = 0;
      this.y = 0;
      this.width = 100;
      this.height = 100;
      this.opacity = 1;
      this.fills = [];
      this.strokes = [];
      this.effects = [];
      this.strokeWeight = 0;
      /** @type {Record<string, any>} */
      this.boundVariables = {};
      /** @type {Record<string, string>} */
      this._shared = {};
      this._layoutAlign = 'INHERIT';
      this._layoutGrow = 0;
      byId.set(this.id, this);
    }
    setSharedPluginData(/** @type {string} */ ns, /** @type {string} */ key, /** @type {string} */ value) {
      if (!/^[A-Za-z0-9_.]{3,}$/.test(ns)) throw new Error('Invalid namespace');
      if (typeof value !== 'string') throw new Error('Shared plugin data must be a string');
      this._shared[`${ns}/${key}`] = value;
    }
    getSharedPluginData(/** @type {string} */ ns, /** @type {string} */ key) {
      return this._shared[`${ns}/${key}`] ?? '';
    }
    setBoundVariable(/** @type {string} */ field, /** @type {any} */ variable) {
      if (!variable?.id) throw new Error('setBoundVariable needs a variable');
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
    }
    resize(/** @type {number} */ w, /** @type {number} */ h) {
      if (!(w > 0 && h > 0)) throw new Error(`resize: bad size ${w}x${h}`);
      this.width = w;
      this.height = h;
      if (this.layoutMode && this.layoutMode !== 'NONE') {
        this.primaryAxisSizingMode = 'FIXED';
        this.counterAxisSizingMode = 'FIXED';
      }
    }
    remove() {
      if (this.parent) this.parent._detach(this);
      this.removed = true;
    }
    get inAutoLayout() {
      return Boolean(this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE');
    }
    get layoutAlign() {
      return this._layoutAlign;
    }
    set layoutAlign(v) {
      if (!this.inAutoLayout) throw new Error('layoutAlign: node must be a child of an auto-layout frame');
      this._layoutAlign = v;
    }
    get layoutGrow() {
      return this._layoutGrow;
    }
    set layoutGrow(v) {
      if (!this.inAutoLayout) throw new Error('layoutGrow: node must be a child of an auto-layout frame');
      this._layoutGrow = v;
    }
  }

  class Container extends Node {
    /** @param {string} type */
    constructor(type) {
      super(type);
      /** @type {Node[]} */
      this.children = [];
    }
    _detach(/** @type {Node} */ c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
      c.parent = null;
    }
    appendChild(/** @type {Node} */ c) {
      this.insertChild(this.children.length, c);
    }
    insertChild(/** @type {number} */ index, /** @type {Node} */ c) {
      if (c.removed) throw new Error('The node has been removed');
      for (let p = /** @type {any} */ (this); p; p = p.parent) if (p === c) throw new Error('Cannot insert a node into itself');
      if (c.parent === this) {
        const from = this.children.indexOf(c);
        this.children.splice(from, 1);
        if (from < index) index--;
      } else if (c.parent) c.parent._detach(c);
      this.children.splice(Math.min(index, this.children.length), 0, c);
      c.parent = this;
    }
    /** @param {(n: Node) => boolean} fn */
    findAll(fn) {
      const out = [];
      const walk = (/** @type {any} */ n) => {
        for (const c of n.children ?? []) {
          if (fn(c)) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    }
    findAllWithCriteria(/** @type {{ types: string[] }} */ { types }) {
      return this.findAll((n) => types.includes(n.type));
    }
  }

  class Frame extends Container {
    constructor(type = 'FRAME') {
      super(type);
      this.layoutMode = 'NONE';
      this.layoutWrap = 'NO_WRAP';
      this.primaryAxisSizingMode = 'AUTO';
      this.counterAxisSizingMode = 'AUTO';
      this.primaryAxisAlignItems = 'MIN';
      this.counterAxisAlignItems = 'MIN';
      this.itemSpacing = 0;
      this.counterAxisSpacing = 0;
      this.paddingLeft = this.paddingRight = this.paddingTop = this.paddingBottom = 0;
      this.topLeftRadius = this.topRightRadius = this.bottomLeftRadius = this.bottomRightRadius = 0;
      this.clipsContent = true;
      /** @type {Record<string, string>} */
      this.explicitVariableModes = {};
    }
    setExplicitVariableModeForCollection(/** @type {any} */ collection, /** @type {string} */ modeId) {
      if (!collection?.modes?.some((/** @type {any} */ m) => m.modeId === modeId)) throw new Error('Unknown mode');
      this.explicitVariableModes[collection.id] = modeId;
    }
  }

  class Text extends Node {
    constructor() {
      super('TEXT');
      this._font = { family: 'Inter', style: 'Regular' };
      this._characters = '';
      this.fontSize = 12;
      this.textAutoResize = 'WIDTH_AND_HEIGHT';
    }
    get fontName() {
      return this._font;
    }
    set fontName(f) {
      requireFont(f);
      this._font = f;
    }
    get fontWeight() {
      return { Regular: 400, Medium: 500, Bold: 700 }[/** @type {'Regular'} */ (this._font.style)] ?? 400;
    }
    get characters() {
      return this._characters;
    }
    set characters(s) {
      requireFont(this._font);
      this._characters = s;
      this.width = Math.max(1, s.length * this.fontSize * 0.5);
    }
    getRangeAllFontNames() {
      return [this._font];
    }
  }

  class Component extends Frame {
    constructor(/** @type {string} */ name, /** @type {string} */ key) {
      super('COMPONENT');
      this.name = name;
      this.key = key;
      /** @type {Record<string, { type: string, defaultValue: any, variantOptions?: string[] }>} */
      this._definitions = {};
      /** @type {Record<string, string>} */
      this.variantProperties = {};
    }
    get componentPropertyDefinitions() {
      if (this.parent?.type === 'COMPONENT_SET') throw new Error('Can only get component property definitions of a component set or non-variant component');
      return this._definitions;
    }
    createInstance() {
      calls.createInstance++;
      return new Instance(this);
    }
  }

  class ComponentSet extends Frame {
    constructor(/** @type {string} */ name, /** @type {string} */ key) {
      super('COMPONENT_SET');
      this.name = name;
      this.key = key;
      /** @type {Record<string, { type: string, defaultValue: any, variantOptions?: string[] }>} */
      this.componentPropertyDefinitions = {};
    }
    get defaultVariant() {
      return this.children[0];
    }
  }

  class Instance extends Frame {
    constructor(/** @type {Component} */ main) {
      super('INSTANCE');
      this._main = main;
      this.name = main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name;
      const owner = main.parent?.type === 'COMPONENT_SET' ? /** @type {any} */ (main.parent) : main;
      const defs = owner.type === 'COMPONENT_SET' ? owner.componentPropertyDefinitions : owner._definitions;
      /** @type {Record<string, { type: string, value: any }>} */
      this.componentProperties = {};
      for (const [k, d] of Object.entries(defs)) {
        this.componentProperties[k] = { type: d.type, value: d.type === 'VARIANT' ? main.variantProperties[k] : d.defaultValue };
      }
      this.width = 120;
      this.height = 40;
    }
    get mainComponent() {
      throw new Error('Cannot access mainComponent with documentAccess: "dynamic-page". Use getMainComponentAsync instead.');
    }
    async getMainComponentAsync() {
      return this._main;
    }
    setProperties(/** @type {Record<string, any>} */ values) {
      calls.setProperties++;
      const owner = this._main.parent?.type === 'COMPONENT_SET' ? /** @type {any} */ (this._main.parent) : this._main;
      const defs = owner.type === 'COMPONENT_SET' ? owner.componentPropertyDefinitions : owner._definitions;
      for (const [k, v] of Object.entries(values)) {
        const d = defs[k];
        if (!d) throw new Error(`Could not find a component property with name: '${k}'`);
        if (d.type === 'VARIANT' && !d.variantOptions?.includes(v)) throw new Error(`Invalid variant value "${v}" for "${k}"`);
        if (d.type === 'BOOLEAN' && typeof v !== 'boolean') throw new Error(`Expected boolean for "${k}"`);
        if (d.type === 'TEXT' && typeof v !== 'string') throw new Error(`Expected string for "${k}"`);
      }
      // Swap to the matching variant, like Figma does, then write the rest.
      if (owner.type === 'COMPONENT_SET') {
        const want = { ...this._main.variantProperties };
        for (const [k, v] of Object.entries(values)) if (defs[k].type === 'VARIANT') want[k] = v;
        const match = owner.children.find((/** @type {Component} */ c) => Object.entries(want).every(([k, v]) => c.variantProperties[k] === v));
        if (!match) throw new Error('No variant matches ' + JSON.stringify(want));
        this._main = match;
      }
      for (const [k, v] of Object.entries(values)) this.componentProperties[k] = { type: defs[k].type, value: v };
    }
  }

  // ------------------------------------------------------------------ variables
  /** @type {any[]} */
  const collections = [];
  /** @type {any[]} */
  const variables = [];
  const variablesApi = {
    async getLocalVariableCollectionsAsync() {
      return [...collections];
    },
    async getLocalVariablesAsync() {
      return [...variables];
    },
    async getVariableByIdAsync(/** @type {string} */ id) {
      return variables.find((v) => v.id === id) ?? null;
    },
    createVariableCollection(/** @type {string} */ name) {
      const c = {
        id: `VariableCollectionId:${newId()}`,
        name,
        modes: [{ modeId: `${newId()}`, name: 'Mode 1' }],
        get defaultModeId() {
          return this.modes[0].modeId;
        },
        get variableIds() {
          return variables.filter((v) => v.variableCollectionId === c.id).map((v) => v.id);
        },
        renameMode(/** @type {string} */ modeId, /** @type {string} */ newName) {
          const m = this.modes.find((/** @type {any} */ x) => x.modeId === modeId);
          if (!m) throw new Error('Unknown mode');
          m.name = newName;
        },
        addMode(/** @type {string} */ modeName) {
          if (this.modes.length >= modeLimit) throw new Error(`Limited to ${modeLimit} modes only`);
          const modeId = `${newId()}`;
          this.modes.push({ modeId, name: modeName });
          return modeId;
        },
      };
      collections.push(c);
      return c;
    },
    createVariable(/** @type {string} */ name, /** @type {any} */ collection, /** @type {string} */ resolvedType) {
      const c = typeof collection === 'string' ? collections.find((x) => x.id === collection) : collection;
      if (!c) throw new Error('Unknown collection');
      if (variables.some((v) => v.variableCollectionId === c.id && v.name === name)) throw new Error(`Duplicate variable name "${name}"`);
      const v = {
        id: `VariableID:${newId()}`,
        name,
        resolvedType,
        variableCollectionId: c.id,
        scopes: ['ALL_SCOPES'],
        /** @type {Record<string, any>} */
        valuesByMode: {},
        setValueForMode(/** @type {string} */ modeId, /** @type {any} */ value) {
          if (!c.modes.some((/** @type {any} */ m) => m.modeId === modeId)) throw new Error('Unknown mode for this collection');
          if (value?.type === 'VARIABLE_ALIAS') {
            const target = variables.find((x) => x.id === value.id);
            if (!target) throw new Error('Alias to a missing variable');
            if (target.resolvedType !== resolvedType) throw new Error('Alias type mismatch');
          } else if (resolvedType === 'COLOR' && !(value && 'r' in value && 'a' in value)) throw new Error('COLOR needs {r,g,b,a}');
          else if (resolvedType === 'FLOAT' && typeof value !== 'number') throw new Error('FLOAT needs a number');
          this.valuesByMode[modeId] = value;
        },
      };
      variables.push(v);
      return v;
    },
    createVariableAlias(/** @type {any} */ variable) {
      if (!variable?.id) throw new Error('createVariableAlias needs a variable');
      return { type: 'VARIABLE_ALIAS', id: variable.id };
    },
    setBoundVariableForPaint(/** @type {any} */ paint, /** @type {string} */ field, /** @type {any} */ variable) {
      if (paint.type !== 'SOLID') throw new Error('Only SOLID paints can bind color');
      if (field !== 'color') throw new Error('Only color is bindable on a paint');
      if ('a' in paint.color) throw new Error('Paint color takes {r,g,b} only');
      return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
    },
  };

  // ------------------------------------------------------------------ document
  const page = new Container('PAGE');
  page.name = 'Page 1';
  Object.defineProperty(page, 'selection', { value: [], writable: true });
  const componentsPage = new Container('PAGE');
  componentsPage.name = 'Components';
  const root = new Container('DOCUMENT');
  root.appendChild(page);
  root.appendChild(componentsPage);
  const rootFind = root.findAllWithCriteria.bind(root);
  root.findAllWithCriteria = (/** @type {any} */ criteria) => {
    if (!pagesLoaded) throw new Error('Cannot call findAllWithCriteria on the document before figma.loadAllPagesAsync() (documentAccess: dynamic-page)');
    return rootFind(criteria);
  };

  /** Build a component (set) from a spec; library ones are not placed in the document. */
  const makeComponent = (/** @type {MockComponentSpec} */ spec) => {
    const { name, key = `key-${name}`, variants = {}, text = {}, booleans = {} } = spec;
    /** @type {Record<string, any>} */
    const defs = {};
    for (const [k, values] of Object.entries(variants)) defs[k] = { type: 'VARIANT', defaultValue: values[0], variantOptions: values };
    for (const [k, v] of Object.entries(text)) defs[k] = { type: 'TEXT', defaultValue: v };
    for (const [k, v] of Object.entries(booleans)) defs[k] = { type: 'BOOLEAN', defaultValue: v };
    const axes = Object.entries(variants);
    if (!axes.length && spec.set !== true) {
      const c = new Component(name, key);
      c._definitions = defs;
      return c;
    }
    const set = new ComponentSet(name, key);
    set.componentPropertyDefinitions = defs;
    /** @type {Record<string, string>[]} */
    let combos = [{}];
    for (const [k, values] of axes) combos = combos.flatMap((c) => values.map((v) => ({ ...c, [k]: v })));
    for (const combo of combos) {
      const c = new Component(Object.entries(combo).map(([k, v]) => `${k}=${v}`).join(', ') || name, `${key}-${Object.values(combo).join('-')}`);
      c.variantProperties = combo;
      set.appendChild(c);
    }
    return set;
  };
  for (const spec of options.localComponents ?? []) componentsPage.appendChild(makeComponent(spec));
  const library = new Map((options.libraryComponents ?? []).map((s) => [s.key, makeComponent(s)]));

  const figma = {
    mixed: MIXED,
    root,
    get currentPage() {
      return page;
    },
    variables: variablesApi,
    createFrame() {
      const f = new Frame();
      page.appendChild(f);
      return f;
    },
    createText() {
      const t = new Text();
      page.appendChild(t);
      return t;
    },
    async loadFontAsync(/** @type {{ family: string, style: string }} */ f) {
      const id = `${f.family}/${f.style}`;
      if (!fonts.includes(id)) throw new Error(`The font "${f.family} ${f.style}" could not be loaded`);
      loadedFonts.add(id);
    },
    async loadAllPagesAsync() {
      calls.loadAllPages++;
      pagesLoaded = true;
    },
    async importComponentByKeyAsync(/** @type {string} */ key) {
      calls.importByKey++;
      const c = library.get(key);
      if (!c || c.type !== 'COMPONENT') throw new Error(`Component with key ${key} not found`);
      return c;
    },
    async importComponentSetByKeyAsync(/** @type {string} */ key) {
      calls.importByKey++;
      const c = library.get(key);
      if (!c || c.type !== 'COMPONENT_SET') throw new Error(`Component set with key ${key} not found`);
      return c;
    },
    async getNodeByIdAsync(/** @type {string} */ id) {
      const n = byId.get(id);
      return n && !n.removed ? n : null;
    },
    notify() {},
  };

  return { figma, page, calls, collections, variables, byId };
}

/** Run a generated script the way figma_execute and use_figma do: as an async function body with `figma` in scope. */
export async function runScript(/** @type {any} */ figma, /** @type {string} */ script) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction('figma', script)(figma);
}

/** Shallow description of a layer tree for readable assertions. */
export function outline(/** @type {any} */ node, depth = 0) {
  const lines = [`${'  '.repeat(depth)}${node.type} ${node.name}`];
  if (node.type !== 'INSTANCE') for (const c of node.children ?? []) lines.push(outline(c, depth + 1));
  return lines.join('\n');
}

/** Harbor's own Figma library, as the mock sees it: component sets with the catalog's property names. */
export const HARBOR_LIBRARY = [
  { name: 'Button', variants: { Variant: ['Primary', 'Secondary', 'Ghost'], Size: ['md', 'sm'], Disabled: ['false', 'true'] }, text: { 'Label#88:1': 'Button' } },
  { name: 'Badge', variants: { Tone: ['Neutral', 'Accent', 'Success', 'Warning', 'Danger'] }, text: { 'Label#4:0': 'Badge' } },
  { name: 'Checkbox', variants: { Checked: ['False', 'True'] }, text: { 'Label#6:0': 'Label' } },
];
