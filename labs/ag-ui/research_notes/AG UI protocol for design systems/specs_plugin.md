# Specs (Nathan Curtis, Directed Edges): what it produces, its data model, and whether it can be an agent's component contract

Research date: 2026-09-30. All URLs below were fetched on that date unless marked otherwise. The Specs docs site (specsplugin.com) was mirrored in full from its sitemap (296 pages) and searched locally; Nathan Curtis's Substack posts were read in full through the Substack posts API. "Specs" now names three generations of product, so every finding below says which one it covers.

Fetch log (what worked, what did not):
- Figma Community pages are client-rendered. The Community search API returned full JSON listings (description, publisher, support contact, user and like counts, created/updated timestamps): `https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all`. `resource_type=plugins` returns HTTP 400 ("Invalid resource type"), so the singular is required.
- `https://www.figma.com/api/plugins/<id>/versions` returned HTTP 403 (CloudFront) for both plugin IDs, so version-by-version release history from Figma could not be read. `https://www.figma.com/api/plugins/<id>` returned 404.
- `specs.design` returns 404. `eightshapes.com` failed at the proxy (502).
- `github.com/DirectedEdges/specs` returned 403 to curl through the proxy but loaded through WebFetch. The GitHub REST API for the org was blocked by the session's repo-scoped proxy.
- The Feb 2023 EightShapes Medium article returned 403 directly and was read from a Wayback Machine snapshot dated 2025-08-23.
- npm registry metadata, unpkg package files, and the specs-cli 0.31.0 tarball were all fetched and inspected directly.
- The State of AI in Design Systems MCP has no record of Nathan Curtis, EightShapes or Specs: `search("Nathan Curtis")` returned 0 hits, and `data/reading.json` has no match. It was used only for the Storybook, Figma Code Connect and Custom Elements Manifest comparison points.

## 1. Identifying the plugin: name, URL, publisher, launch date, pricing, docs

### Takeaway
As of September 2026, "Specs" is a family of products. **Specs 2** (Figma Community plugin 1549454283615386215, first published in 2025 as "Anova") is the current plugin. **Specs Classic** (plugin 1205622541257680763, launched February 2023 as "EightShapes Specs") is deprecated. Both are published by "Directed Edges Plugins", Nathan Curtis's company Directed Edges LLC, which replaced his earlier EightShapes affiliation. Around the plugin sit a CLI, a JSON Schema package, and a docs site at specsplugin.com. The plugin is free to use, and Pro costs $10/month through Polar.

### Cited Findings
- **Specs 2 (current).** Figma Community ID `1549454283615386215`, URL https://www.figma.com/community/plugin/1549454283615386215. The listing name is "Specs 2" and the tagline is "Describe your component in data for handoff, pipelines and AI". Publisher is "Directed Edges Plugins" (handle `directededges`, Fairfax, VA), support contact is `nathan@specsplugin.com`, and the listing links "Docs" to directededges.github.io/specs/settings/ and issues to github.com/DirectedEdges/specs. The index timestamps read created_at 2025-09-15 and updated_at 2026-08-17. The listing had 2,997 users and 244 likes when fetched. — [Figma Community search API](https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all)
- Nathan Curtis links to Specs 2 with the slug `specs-2-formerly-anova`, which confirms it was renamed from Anova. — [Spec-Driven UI Component Development (2026-08-14)](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)
- The licensing page says: "This page covers licensing for Specs 2 — first published on the Figma community in 2025 as 'Anova' — and the Specs CLI." It also says: "Specs (Classic) is the original Figma plugin launched in 2023." — [Specs Licensing](https://www.specsplugin.com/overview/licensing/)
- In October 2025 Curtis wrote: "The Anova plugin [https://www.figma.com/community/plugin/1549454283615386215/anova], recently released in the Figma community … Built as a second generation the Specs plugin engine." The name "alludes to traditional statistical analysis of variance" but "the plugin isn't actually doing statistical analysis." — [Analysis of Variants (2025-10-07)](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e)
- **Specs Classic (deprecated).** Figma Community ID `1205622541257680763`, URL https://www.figma.com/community/plugin/1205622541257680763. The listing name is now "Specs Classic" and the tagline is "Generate component specs including anatomy, props and layout & spacing". It carries the notice "SPECS CLASSIC IS DEPRECATED. USE SPECS 2. This Specs Classic plugin (published 2023) is now deprecated and no longer enables new subscriptions to premium features." The listing says Classic's premium tier used "the Figma Payment platform" and that "team and organization licensing is not available". It is signed "Made by @nathanacurtis of Directed Edges LLC." Support is `nathan@directededges.com` and issues still point to `github.com/EightShapes/specs-plugin`. The listing had 139,352 users and 5,571 likes and was updated 2026-06-24. — [Figma Community search API](https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all)
- **Classic's original name and launch.** Curtis's EightShapes article "The EightShapes Specs Figma Plugin" is dated Feb 13, 2023: "I built and published a Figma plugin that automates Anatomy, Props and Layout and spacing." — [EightShapes Medium article, Wayback snapshot 2025-08-23](http://web.archive.org/web/20250823100333/https://medium.com/eightshapes-llc/the-eightshapes-specs-figma-plugin-2892f21adc96). His Feb 20, 2023 post links the plugin with the slug `/1205622541257680763/EightShapes-Specs`. — [Component Specifications (2023-02-20)](https://nathanacurtis.substack.com/p/component-specifications-1492ca4c94c). The Wayback Machine holds a snapshot of the plugin page from 2023-03-20. — [Wayback availability API](https://archive.org/wayback/available?url=www.figma.com/community/plugin/1205622541257680763)
- The search index's `created_at` for Classic (2024-11-26) contradicts the documented 2023 launch. That field is therefore not a publish date, and Specs 2's 2025-09-15 value is only indicative. — [Figma Community search API](https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all); contradicted by [Specs Licensing](https://www.specsplugin.com/overview/licensing/)
- **Companion docs site:** https://www.specsplugin.com/ ("Specs as your component canon — change after change"). It covers the plugin, CLI, schema, ADRs, roles, code transforms, versioning, releases, licensing and terms. directededges.github.io/specs/* redirects there. — [specsplugin.com](https://www.specsplugin.com/)
- **Author's company:** Smashing Conference describes Curtis as "Founder and design systems consultant at Directed Edges." — [SmashingConf Amsterdam 2026 speaker page](https://smashingconf.com/amsterdam-2026/speakers/nathan-curtis/)
- **Pricing.** "Specs works at two tiers: Free and Pro… Everything is usable at the free tier. Nothing is time-limited, watermarked, or withheld until you pay… A Pro subscription is $10/month." Pro is bought through Polar. A Pro plugin key works on up to two machines. CLI Pro usage "is metered at 50 generations per month", with top-off packs available. Team seats get volume discounts: 10% off for 5–9 seats, 20% off for 10+. Classic subscriptions "cannot be transferred, converted, or applied to Specs 2 or the CLI." — [Specs Licensing](https://www.specsplugin.com/overview/licensing/)
- **Package licenses.** "`packages/schema/` is licensed under CC BY 4.0… `packages/cli/` is licensed under MIT". — [Specs License](https://www.specsplugin.com/overview/license/)
- npm shows `@directededges/specs-schema` 0.34.0 as CC-BY-4.0 and `@directededges/specs-cli` 0.31.0 as MIT. The engine `@directededges/specs-from-figma` 0.33.0 is `PolyForm-Internal-Use-1.0.0`, which is not an open-source license. `react-from-specs` and `webcomponents-from-specs` (0.3.0) declare no license. — [npm: specs-schema](https://registry.npmjs.org/@directededges%2Fspecs-schema), [npm: specs-cli](https://registry.npmjs.org/@directededges%2Fspecs-cli), [npm: specs-from-figma](https://registry.npmjs.org/@directededges%2Fspecs-from-figma), [npm: react-from-specs](https://registry.npmjs.org/@directededges%2Freact-from-specs)
- The GitHub README lists the engine `@directededges/specs-from-figma` as a "(private repo)". The public repo `DirectedEdges/specs` has the description "Schema, types, and command line tools to record and manage UI component specifications." — [GitHub DirectedEdges/specs](https://github.com/DirectedEdges/specs)
- The Terms of Service are effective April 6, 2026. They say "All data processing performed by the Services occurs locally on your machine", except for license-key validation. — [Specs Terms of Service](https://www.specsplugin.com/overview/terms-of-service/)

### Inferences
- A September 2026 reference to "the Specs plugin" is ambiguous. For machine-readable output, the relevant product is Specs 2 plus the CLI and schema. Classic's 139k users reflect its 2023–2025 installed base, not current direction.
- The open parts are the schema (CC BY 4.0) and the CLI shell (MIT). The Figma-to-spec engine is proprietary and internal-use only. A team can validate and consume specs freely, but generating them depends on Directed Edges' engine and, for the richer fields, a paid key.

### Gaps
- The exact first-publish date of Specs 2/Anova on Figma could not be read, because the Figma versions API returned 403. The evidence places it between September and early October 2025 (index timestamp 2025-09-15; a post on 2025-10-07 calls it "recently released").
- Classic's historical pricing on the Figma payment platform could not be retrieved.
- No page found on eightshapes.com could be loaded, because the proxy returned 502.

## 2. What it generates, and what it reads from Figma

### Takeaway
Specs 2 generates six on-canvas sections: Anatomy, Props, Layout, Modes, Styling and Data. The Data section holds the same spec as YAML or JSON. It computes these by enumerating every variant combination of a selected component or component set. It reads Figma component properties, variables, styles, auto layout, constraints, Dev Mode status and, when enabled, Dev Mode annotations for roles and actions. Classic (2023) produced Figma frames only for Title, Anatomy, Props and Layout & spacing, and it compared variants one property at a time.

### Cited Findings
- The Specs 2 plugin page promises "One click, six sections". **Anatomy** is "Numbered markers annotate every element, with key attributes listed alongside". **Props** is "Every property, its options, and exactly what changes on the canvas when it's set". **Layout** is "Direction, alignment, resizing, padding, and spacing annotated directly on the artwork". **Modes** is "Side-by-side exhibits for every light/dark or other variable mode the component uses". **Styling** is "Every detected variable and style, what role it plays, and where it's applied". **Data** is "The same spec as structured YAML or JSON — a ready-made contract for AI/LLM tools". — [Specs 2 Figma Plugin](https://www.specsplugin.com/plugin/)
- The Specs 2 listing says the plugin turns "a selected Figma component or component set into a compact, complete, schema-valid specification — computed directly from the file, not inferred from a screenshot". It "evaluates every variant combination, every prop binding, and every slot, where Specs Classic and manual inspection alike miss multi-prop interactions and edge-case combinations," and "what you see on the canvas is the same structure you can give LLMs as YAML or JSON data." — [Figma Community search API](https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all)
- The homepage lists what a spec records: "Anatomy — Every element by type… Props — All properties with every explicit per-variant difference detected. Styling — Token references, named styles, typography, and effects. Layout — Element hierarchy and flex vs. absolute positioning per variant. Bindings — Prop bindings driving content, instances, and conditionals. Subcomponents — discovered from your naming conventions. Slots… Ready-made examples… Assets — Icon glyphs precisely distinguished from nested instances." — [specsplugin.com](https://www.specsplugin.com/)
- On-canvas Anatomy includes "Numbered markers — over each uniquely named element" plus "Attributes — of styles like color, size, corner radius, strokes, effects, and typography in their default values" and "Bindings — of text, boolean, instance swap and slot props". Extra exhibits appear "whenever a new, uniquely named layer is detected" in another variant. — [Plugin: Anatomy](https://www.specsplugin.com/plugin/anatomy/)
- **Figma property types read.** The prop extension records the Figma type, "e.g. `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `VARIANT`". Slot constraints align with "Figma native `slotSettings`". "Code-only props" are read from a hidden container layer (`kind: codeOnlyProp`, `layer`). — [Schema: Props](https://www.specsplugin.com/schema/props/)
- **Variables and styles.** Token references carry `$extensions.com.figma` `{id, name, collectionName, rawValue}` for Figma variables, and `S:`-prefixed IDs for text and effect styles. — [Schema: TokenReference](https://www.specsplugin.com/schema/token-reference/)
- The CLI's `variables` fetch is limited because "Figma restricts the variables REST endpoints to organizations on an Enterprise plan… on any other plan, fetch variables through the plugin with `--from-bridge`". — [CLI Overview](https://www.specsplugin.com/cli/)
- **Dev Mode status.** "By default, `scan` checks only components marked Ready for Dev in Figma." — [CLI Getting Started](https://www.specsplugin.com/cli/getting-started/)
- **Dev Mode annotations for roles and actions.** "Roles are annotated in Figma, on the component node or on a layer inside it… An annotation's text carries one signal per line, in the form `key:value`: `role:button`." Actions use `action:dismiss` in "the same Dev Mode annotation". "Nothing is read or emitted unless `settings.spec.roles` is on." — [Roles](https://www.specsplugin.com/roles/), [Actions](https://www.specsplugin.com/actions/)
- Curtis states that roles cannot be derived from structure: "Figma has no first-class concept of interactive semantics — a checkbox control and a decorative square are the same node type." He adds that three components with the same anatomy "require three different root semantics", and "No structural analysis separates them." — [ADR 067 — Element Behavior Roles](https://www.specsplugin.com/adr/067-anatomy-element-roles/)
- **Classic's output (Feb 2023).** "After processing is complete, a design specification of multiple frames — Title, Anatomy, Props (if an instance) and Layout and spacing (if Autolayout is used) — appears on the canvas." "The plugin produces and organizes output as Figma frames." For variant props it "compares a default with each alternative option". Compound props were "not automated". Accessibility, behavior and motion were left to designers "to continue to manually assemble". — [EightShapes Medium article, Wayback](http://web.archive.org/web/20250823100333/https://medium.com/eightshapes-llc/the-eightshapes-specs-figma-plugin-2892f21adc96)
- Classic later gained some data output: Curtis says the Specs plugin "launched in 2023 and has output similar if less refined data for over a year" (as of Oct 2025). — [Analysis of Variants](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e). He also says Classic offered a "Two way" feature, equivalent to `variantDepth:2`, while "I run Specs on variantDepth:9999 every time". — [What Component Specs Leave Behind (2026-08-27)](https://nathanacurtis.substack.com/p/what-component-specs-leave-behind)
- **What Specs cannot or will not carry.** It cannot carry "Customized prop order in Figma's Props panel" (the plugin API does not expose it) or both bound variables under a locked aspect ratio. Grid auto layout, some line endpoint styles, and stacked fills and strokes are "not yet" supported. Figma motion "won't be supported". — [What Component Specs Leave Behind](https://nathanacurtis.substack.com/p/what-component-specs-leave-behind)
- On the canvas, crowded components such as a Date Picker "can produce an exhibit that's harder to read than it is useful". — [Plugin: Anatomy](https://www.specsplugin.com/plugin/anatomy/)

### Inferences
- Specs 2's data is a full, variant-exhaustive description of a Figma component's visual contract (structure, styling, layout, prop bindings), plus opt-in semantics (roles and actions) that designers author as Dev Mode annotations. The only behavior and accessibility in it is what a designer annotated: a role vocabulary and one action (`dismiss`). Everything else about behavior comes from Curtis's separately authored "supplemental requirements" markdown (section 4).

### Gaps
- The plugin/props, plugin/modes and plugin/styling pages were mirrored but not individually reviewed beyond the plugin overview. No independent screenshots of canvas output were examined; only the docs' descriptions and captions were read.
- I did not verify when Classic gained its data export or what that export's format was (Curtis says only "similar if less refined data").

## 3. Output formats, data model and machine-readability

### Takeaway
Specs 2 output is machine-readable, schema-valid YAML or JSON that validates against a published **JSON Schema (draft-07)**. The schema ships in the npm package `@directededges/specs-schema` (0.34.0, CC BY 4.0) with TypeScript types. A spec is a **component definition document**: title, anatomy, props, a default variant, layered variant deltas, invalid prop combinations, subcomponents, examples and metadata. It is not itself a JSON Schema of the component's props. Token references follow a DTCG-style `$token`/`$type` shape. Key agent-relevant fields are gated behind Pro: token references, prop bindings, invalid combinations and examples.

### Cited Findings
- The About page says: "Specs is a deterministic engine that reads Figma components and produces complete, machine-readable specifications in YAML or JSON. A spec captures everything about a component: its anatomy (element hierarchy), props (types, enums, defaults), styles (values and token references), and variants (how prop combinations change styles across elements)." CLI and plugin share "the same processing engine (`@directededges/specs-from-figma`)" and "Both produce identical output from the same input." — [About Specs](https://www.specsplugin.com/overview/aboutspecs/)
- The Data section "provides the component's full spec as a single block of text… formatted as YAML or JSON". The plugin defaults to YAML. "Each documented subcomponent gets its own separate Data block." — [Plugin: Data](https://www.specsplugin.com/plugin/data/). The CLI setting `spec.format` defaults to `JSON`, which conflicts with the plugin's YAML default. — [Settings: format](https://www.specsplugin.com/settings/output-format/)
- **Schema package.** "The `@directededges/specs-schema` package defines the TypeScript types and JSON Schema for a component spec." Its only runtime exports are `DEFAULT_SETTINGS` and `DEFAULT_PIPELINE`. — [Schema Overview](https://www.specsplugin.com/schema/)
- npm `exports` maps `./schema/component`, `./schema/concern`, `./schema/metadata`, `./schema/settings` and `./schema/conventions` to `.schema.json` files. — [npm: specs-schema](https://registry.npmjs.org/@directededges%2Fspecs-schema)
- The published `component.schema.json` declares `"$schema": "http://json-schema.org/draft-07/schema#"` and `"title": "Specs Plugin Output Schema"`, with no `$id` and 46 definitions. `root.schema.json` is a `oneOf` over component, components, metadata and concern schemas, and still carries `"version": "0.12.0"` in package 0.34.0. — [unpkg: component.schema.json 0.34.0](https://unpkg.com/@directededges/specs-schema@0.34.0/schema/component.schema.json), [unpkg: root.schema.json](https://unpkg.com/@directededges/specs-schema@0.34.0/schema/root.schema.json)
- **Spec tree**, reproduced from the schema overview:
  ```
  components:
  └─ {component name}                        → Component
    ├─ anatomy:      {element name}: { type, slot }
    ├─ props:        {prop name}: { type, default, … }
    ├─ default:                              → Variant
    │   ├─ layout:   - {parent}: - {child}
    │   └─ elements: {element name}: content → PropBinding; children → Children;
    │                 styles: (48 properties) color/spacing/size/layout/typography/effects
    │                 → TokenReference | Conditional | PropBinding | Corners | Sides …
    ├─ variants:     - configuration / layout / elements  (layered deltas)
    ├─ invalidPropCombinations:              → PropConfigurations[]
    ├─ subcomponents: {name}: { …same shape }
    ├─ metadata:     source (required), conventions, settings
    ├─ instanceExamples:                      (Pro)
    └─ slotContentExamples:                   (Pro)
  ```
  "Variants are deltas. Each entry in `variants` carries a `configuration`… and only the properties that change. Consumers resolve the final state by merging applicable overrides onto the default, in order." A style value may be "a raw literal, a `TokenReference`…, a `PropBinding` driven by a prop, or a `Conditional`". `$binding` is "A JSON Pointer to a prop (e.g. `#/props/label`)". — [Schema Overview](https://www.specsplugin.com/schema/)
- **Component root.** Required fields are `title`, `anatomy` and `default`. Optional fields are `props`, `variants`, `invalidPropCombinations`, `subcomponents`, `metadata`, `instanceExamples` (Pro), `slotContentExamples` (Pro) and `images`. — [Schema: Component](https://www.specsplugin.com/schema/component/). The JSON Schema's `Component.required` is `["title","anatomy","default"]`. — [unpkg: component.schema.json](https://unpkg.com/@directededges/specs-schema@0.34.0/schema/component.schema.json)
- **Split "concern" documents.** A `splitConcerns` run writes `api.yaml` (`metadata`, `title`, `anatomy`, `props`, plus `invalidPropCombinations` and `subcomponents`), `variants.yaml` (`metadata`, `default`, `variants`) and `examples.yaml`. Each is its own schema type and states `metadata.concern`. — [Schema: Component](https://www.specsplugin.com/schema/component/). The CLI default is one directory per component holding these concern files, and "Example output is a Pro feature — on the free tier it's omitted entirely." — [CLI: generate](https://www.specsplugin.com/cli/commands/generate/)
- **Props.** `AnyProp = BooleanProp | StringProp | EnumProp | NumberProp | SlotProp | ImageProp`.
  - BooleanProp: `{type:'boolean', default}`.
  - EnumProp: `{type:'string', default, enum[], nullable?}`.
  - StringProp: `{type:'string', examples?, nullable?}`; its `default` is deprecated.
  - NumberProp: `{type:'number', default?, enum?, nullable?, examples?}`.
  - SlotProp: `{type:'slot', default?, nullable?, minChildren?, maxChildren?, anyOf?: string[]}`, where `anyOf` means "Permitted component type names".
  - ImageProp: `{type:'image', …}`.
  - All kinds accept `$extensions['com.figma']` with `{type, source, name}`.
  — [Schema: Props](https://www.specsplugin.com/schema/props/)
- In the JSON Schema, `AnyProp` is a `oneOf` of the six prop kinds. Several have `additionalProperties: false` with `patternProperties: {"^\\$": {}}`. — [unpkg: component.schema.json](https://unpkg.com/@directededges/specs-schema@0.34.0/schema/component.schema.json)
- **Anatomy.** `Anatomy = Record<string, AnatomyElement>`. An AnatomyElement has `type` (one of 11: `text`, `glyph`, `vector`, `container`, `slot`, `instance`, `line`, `ellipse`, `rectangle`, `polygon`, `star`, or an `ElementTypeRef`), `detectedIn`, `instanceOf` (string or `{$ref:"#/subcomponents/…"}`), `role` (string or string[]), `actions` (`[{type}]`) and `$extensions`. — [Schema: Anatomy](https://www.specsplugin.com/schema/anatomy/). In the JSON Schema, `role` is "Semantic behavior role… Recognized concept names are published on the docs site; unrecognized values are ignored by transforms", and `actions` items are `{type}` with `additionalProperties:false`. — [unpkg: component.schema.json](https://unpkg.com/@directededges/specs-schema@0.34.0/schema/component.schema.json)
- The **role vocabulary** has its own docs pages: button, checkbox, disclosure, errormessage, group, indicator, label, link, panel, radio, status, switch, textbox, togglebutton, value, plus precedence and inventory. "The value is an open string." — [Roles](https://www.specsplugin.com/roles/). The only documented **action** is `dismiss`, which adds `onDismiss?: () => void`. — [Actions](https://www.specsplugin.com/actions/)
- **TokenReference.** `{ $token: string; $type: string; $extensions?: object }`, "following the Design Tokens Community Group (DTCG) format". `$type` is one of `color`, `dimension`, `string`, `number`, `boolean`, `shadow`, `gradient`, `typography`, `effects`. Example:
  ```yaml
  backgroundColor:
    $token: DS Color.Surface.Primary
    $type: color
    $extensions:
      com.figma: { id: "VariableID:123:456", name: Surface/Primary, collectionName: DS Color, rawValue: "#FFFFFF" }
  ```
  — [Schema: TokenReference](https://www.specsplugin.com/schema/token-reference/)
- **Metadata.** Only `source` (`pageId`, `nodeId`, `nodeType`: COMPONENT, COMPONENT_SET or FRAME) is required. Optional fields are `author`, `lastUpdated`, `generator` (`name`, `version`, `url`, optional `license` `{status: VALID|EXPIRED|NONE, level: FREE|PRO|EXTENDED}`), `schema` (`url`, `version`, `latest`), `conventions` and `settings`. Run-level facts can live in a separate `RunMetadata` document (`latest.metadata.yaml`). — [Schema: Metadata](https://www.specsplugin.com/schema/metadata/), [CLI: generate](https://www.specsplugin.com/cli/commands/generate/)
- **Sample spec from the docs** (a favorite/toggle button):
  ```yaml
  anatomy:
    root: { type: container, role: togglebutton }
    icon: { type: glyph }
  props:
    selected: { type: boolean, default: false }
    state: { type: string, default: Rest, enum: [Rest, Hover, Pressed], nullable: false }
    disabled: { type: boolean, default: false }
    accessibilityLabel:
      type: string
      examples: [Example label]
      $extensions: { com.figma: { type: TEXT, source: { kind: codeOnlyProp, layer: Accessibility label } } }
  invalidPropCombinations:
    - { state: Hover, disabled: true }
    - { state: Pressed, disabled: true }
  ```
  — [Code: Contract](https://www.specsplugin.com/code/contract/)
- **Free vs Pro in the data.** "Data — Free: Component structure, variant evaluation, and metadata. Pro adds: Token and style references, prop bindings, invalid combinations." — [Specs Licensing](https://www.specsplugin.com/overview/licensing/). The CLI table marks "Design token references" and "Variable and visibility bindings" as Pro-only. — [CLI Overview](https://www.specsplugin.com/cli/). ADR 001 adds `generator.license` "for downstream entitlement gating". — [Schema: Metadata](https://www.specsplugin.com/schema/metadata/)
- **Compactness (vendor claim).** "A Button component that spans 42,000+ lines and 26,000+ properties in raw Figma JSON compresses to ~400 lines of structured spec — a 99%+ reduction." — [About Specs](https://www.specsplugin.com/overview/aboutspecs/). Curtis's worked numbers are Button 1.38MB → 10KB/442 lines, and Action List 2.6MB → 14KB. — [Figma Component Specs on Command (2026-04-20)](https://nathanacurtis.substack.com/p/figma-component-specs-on-command)
- **Change pace.** The schema went through 18 npm versions between 2026-04-06 and 2026-09-23. — [npm: specs-schema](https://registry.npmjs.org/@directededges%2Fspecs-schema). Recent releases include breaking renames: 0.33.0 made six `Metadata` keys optional, and 0.34.0 renamed `invalidVariantCombinations` → `invalidPropCombinations`. — [Releases](https://www.specsplugin.com/overview/releases/)
- **Docs inconsistency.** The CLI overview's "Output Format" example shows an older shape: `type: variant`/`values: […]` props, anatomy as a list with `type: FRAME`/`TEXT`, and `paddingLeft: { value: 12, type: ABSOLUTE }`. This contradicts the current schema pages: `type:'string'` with `enum`, anatomy as a map with lowercase element types, and start/end `Sides`. — [CLI Overview](https://www.specsplugin.com/cli/); contradicted by [Schema: Props](https://www.specsplugin.com/schema/props/) and [Schema: Anatomy](https://www.specsplugin.com/schema/anatomy/)
- The schema overview counts "(48 properties)" of styles, while Curtis writes ">50 style properties". — [Schema Overview](https://www.specsplugin.com/schema/); [Spec-Driven UI Component Development](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)

### Inferences
- **Machine-readable, yes. Directly usable as an agent tool schema, no.** A Specs spec is an instance document that validates against the Specs meta-schema. It is not a JSON Schema for the component's props. To use it as AG-UI frontend-tool `parameters`, or as a generative-UI renderer's catalog entry, a team would write a transform. BooleanProp maps to `{type:"boolean", default}`, EnumProp to `{type:"string", enum, default}`, and String/Number props to their types with nullability from `nullable`. A SlotProp maps to a children array whose items are limited to `anyOf` component names within `minChildren`/`maxChildren`. `invalidPropCombinations` maps to `not`/`allOf` clauses. Specs ships no such transform. Its code transforms emit a TypeScript `contract.ts` (props interface, enums, defaults), React/Lit scaffolds, CSS and Storybook stories. `contract.ts` is the nearest existing artifact to a prop schema.
- The fields most useful for constraining an agent are closed enums with defaults, invalid prop combinations, slot allow-lists and cardinality, and roles. Of these, invalid combinations and token references are Pro-only, and roles are opt-in and depend on designer annotations. A free-tier spec therefore constrains an agent less than the schema suggests.
- The schema moved through 18 versions in under six months, with breaking renames, and root metadata is stale (`version: 0.12.0`, no `$id`). Any agent-facing contract built on it should pin a schema version and validate on regenerate.

### Gaps
- No real customer spec file was examined. A `github.com/DirectedEdges/spec-demo` repo is referenced from the releases page but was not fetched. All examples above come from the docs.
- The full `styles.schema.json` (48 style properties) was not reproduced here.

## 4. Nathan Curtis's writing (2023–2026) on specs as data, contracts and AI agents

### Takeaway
Curtis moved his writing from EightShapes Medium to his own Substack. From September 2025 to September 2026 he published a steady series on "components as data", "analysis of variants", contracts and schemas, spec-driven UI development, round-trip loss testing, conventions, code generation, and roles. His core claim is that the Figma-to-spec step should be **deterministic computation, not AI inference**. In his view AI belongs **downstream**, consuming a compact, versioned, schema-validated contract. MCP-based crawling of raw Figma data is expensive, ephemeral and platform-biased, and markdown or DESIGN.md-style context is too loose to arbitrate.

### Cited Findings
- Substack archive, newest first:
  - "Component and Part Roles as Composites of Behavior and Accessibility" (2026-09-28)
  - "Generating Code from Figma via Specs" (2026-09-24)
  - "Design System Conventions in Figma" (2026-09-14)
  - "What Component Specs Leave Behind" (2026-08-27)
  - "Spec-Driven UI Component Development" (2026-08-14)
  - "Component Contracts and Schemas" (2026-07-28)
  - "Component Examples as Data" (2026-05-26)
  - "Figma Component Specs on Command" (2026-04-20)
  - "Implementing Slots in a Figma Library" (2026-03-02)
  - "Configuration Collapse" (2026-02-27)
  - "Figma Slots for Repeating Items" (2026-01-23)
  - "'Code Only' Props in Figma" (2026-01-16)
  - "Slots in Design Systems" (2025-11-07)
  - "Analysis of Variants" (2025-10-07)
  - "Components as Data" (2025-09-23)
  - "Purposeful vs Aesthetic Naming" (2025-06-23)
  - "Component Specifications" (2023-02-20, older)

  Most are mirrored on medium.com/@nathanacurtis. — [Substack archive API](https://nathanacurtis.substack.com/api/v1/archive?sort=new&limit=50), [Medium RSS](https://medium.com/feed/@nathanacurtis)
- **Computation over inference.** "When I watch an AI agent spend four minutes crawling a Figma file to answer a question I already knew the answer to… the answer is computable… It should be a diff!" "Never rely on a predictive model when you can count something directly." "AI belongs in this pipeline: *downstream*, not necessarily to generate specs." "AI should be reading, not writing, these specs from Figma." — [Figma Component Specs on Command](https://nathanacurtis.substack.com/p/figma-component-specs-on-command)
- **On MCP.** "MCP is genuinely useful and fits this workflow well. It's human-paced exploration now with an AI turboboost." But "MCP fetches and processes vast payloads every time… Nothing persists." Raw Figma data is "26,901 properties when you need ~350", and "Figma lacks a native model for ARIA roles and screen reader labels." — [Figma Component Specs on Command](https://nathanacurtis.substack.com/p/figma-component-specs-on-command)
- In 2025 he warned that Figma's Dev Mode MCP Server gives "a stochastic, incomplete, and imprecise component description biased towards one platform (like React) and framework (like Tailwind)." — [Components as Data (2025-09-23)](https://nathanacurtis.substack.com/p/components-as-data-2be178777f21). In October 2025 he wrote that MCP-extracted data "transformed further via LLMs, yields unpredictable results… frustratingly different run to run", and that "MCP server and/or Figma REST API integration could prove useful directions to pursue." — [Analysis of Variants](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e)
- **"A description informs. A contract arbitrates."** In a multi-platform system, "React, iOS, Android, Web Components and – yes – even Figma are all parties to that contract." "A schema models what a contract can say. A spec based on that schema is what a contract does say." He argues for seven principles: well-typed, normalized, platform-independent, verifiable, deterministic, efficient to keep true, and evolvable through ADRs. — [Component Contracts and Schemas (2026-07-28)](https://nathanacurtis.substack.com/p/component-contracts-and-schemas)
- **On markdown and DESIGN.md-style context.** "Markdown components specs have spread for a reason: anyone can author it, PR tools can review it, agents can read and write it… Yet, markdown is loosely structured and not structurally validated, leaving it weak to arbitration." "In 2026, solely markdown formats serving as 'THE System' – foundational context to guide agents making decisions – makes me nervous." "A validated extract isn't strict if downstream recipients consume a markdown file that an LLM already smoothed and elaborated… every consumer downstream is inferring from inference." — [Component Contracts and Schemas](https://nathanacurtis.substack.com/p/component-contracts-and-schemas)
- **Scripts first, agents last.** "With a strong contract, component production is supported by scripts that generate 80-90% of the code you need before agents get to work. This leaves agentic inference for last strides." — [Component Contracts and Schemas](https://nathanacurtis.substack.com/p/component-contracts-and-schemas). Engineering teams are "building factories of their own – scripts first, agents and humans at the end of the line". — [Generating Code from Figma via Specs (2026-09-24)](https://nathanacurtis.substack.com/p/generating-code-from-specs)
- **Generated plus authored specs.** "Figma can't express every intent… Designers I work with don't use Figma to express behaviors or accessibility… Figma can't express advanced layout and configurations like discriminated unions." Teams add "authored supplemental requirements" in files like `configurations.md` or `card.accessibility.android.md`, written with MUST/SHOULD/COULD, which "Downstream agents and scripts find and filter". — [Spec-Driven UI Component Development](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)
- **Specs are a build contract, not usage docs.** "prop tables and 'how to use' React, iOS and Android originate more appropriately from coded implementations… Specs are far more about how to make the components well." Also: "No agent needs to call a library via MCP, extract and pivot the data themselves", because `specs analyze` reports answer cross-library questions. — [Spec-Driven UI Component Development](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)
- **Versioning.** Schema validation lets semver be computed: removing a prop is breaking, adding an anatomy element is minor, rebinding a token in one variant is a patch. — [Spec-Driven UI Component Development](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)
- **Round trips and depth.** "Most tools and demos I see go no more than two levels deep [of variant combinations]… I run Specs on variantDepth:9999 every time." "A shallow contract round-trips perfectly… flawless yet entirely misleading losslessness." The spec → Figma → spec loop is run by an agent with a harness and a report skill. — [What Component Specs Leave Behind](https://nathanacurtis.substack.com/p/what-component-specs-leave-behind)
- **Roles as composites.** "A name declares identity… A role declares intent, how a component or part behaves. Overloading names to carry both means authoring is constrained or generators and agents infer anyway." A generated component without roles was "a <div>… if clicked? Nothing." Curtis notes this post "started from an AI draft". — [Component and Part Roles as Composites (2026-09-28)](https://nathanacurtis.substack.com/p/component-and-part-roles-as-composites)
- **Examples as a corpus.** "AI gets a corpus encoding patterns, rules and guidance." Examples move "towards a language of space and structure and composition that can be machine readable." Default slot content "is NOT part of the component's configurable contract." — [Component Examples as Data (2026-05-26)](https://nathanacurtis.substack.com/p/component-examples-as-data)
- **The 2023 pre-AI framing.** "Figma components don't reveal everything you need to know to built a well-designed component… behaviors, code only properties, accessibility." — [Component Specifications (2023-02-20)](https://nathanacurtis.substack.com/p/component-specifications-1492ca4c94c)
- **Talks.** At SmashingConf Amsterdam 2026 Curtis gave "Components as Data for Humans _and_ Machines" ("designing a component schema that machines love"), a chat with T.J. called "Tokens, Tools, and Total Chaos", and a workshop, "Architecting Component Anatomy, Props and Slots". — [SmashingConf Amsterdam 2026](https://smashingconf.com/amsterdam-2026/speakers/nathan-curtis/)

### Inferences
- Curtis's position fits "Specs output as the contract an agent is constrained by", with a caveat. He sees the spec as the thing *builders* (scripts, then agents) implement against. He does not describe it as a runtime catalog for agents that *compose* UI from finished components. He explicitly assigns "how to use" knowledge to code implementations.
- His critique of Figma MCP and of markdown context (non-deterministic, platform-biased, unverifiable) is the same argument AG-UI and generative-UI renderers make for strict JSON Schema tool contracts. That makes his work a natural upstream source for such schemas, even though he never names AG-UI.

### Gaps
- No Curtis writing, talk or post found mentions AG-UI, A2UI, generative UI, CopilotKit or tool calling. A text search of all 12 fetched Substack posts and all 296 docs pages for these terms returned zero hits.
- The month and year of the Smashing Amsterdam "Wed 15th" sessions were not captured. LinkedIn posts and podcasts (an Apple Podcasts ID appeared in search) were not reviewed. Into Design Systems, Clarity and Config talk pages were not searched, for lack of tool budget.

## 5. Integration points: API, CLI, MCP, GitHub, code sync, AI agents, AG-UI, Storybook

### Takeaway
Specs 2 has real integration surface:
- an npm CLI (`specs`) that fetches through the Figma REST API
- GitHub Actions recipes for scheduled regeneration
- a local WebSocket "bridge" between CLI and plugin
- code transforms to TypeScript contracts, React and Lit scaffolds, CSS and Storybook CSF stories
- Claude Code onboarding and emitted Claude skills for versioning workflows

There is **no MCP server in the current CLI**. The Terms of Service and the first CLI release note both mention one, but the 0.31.0 package contains no MCP code. There is **no AG-UI integration**, and no Figma Code Connect mention in the docs.

### Cited Findings
- **CLI.** `npm install -g @directededges/specs-cli`, then `specs init`, `specs fetch`, `specs scan`, `specs generate`. It needs Node 18+, a `FIGMA_TOKEN` with `file_content:read`, `file_variables:read` and other scopes, and optionally `SPECS_LICENSE_KEY`. The getting-started page offers "Using Claude Code? … Paste this into Claude Code: Onboard me to Specs CLI following the ONBOARDING.md instructions in this repo." — [CLI Getting Started](https://www.specsplugin.com/cli/getting-started/)
- **CLI commands:** `init`, `fetch`, `scan`, `applyCustomTokens`, `generate`, `analyze`, `migrate`, `version`, `skills`, plus experimental `react`, `webcomponents`, `bridge`, `cache` and `render`. The list has no MCP command. — [CLI Overview](https://www.specsplugin.com/cli/)
- **Claude skills.** `specs skills install` emits `specs-cli.premerge` and `specs-cli.release` into `.claude/skills/`. The skills "never generate report or changelog content themselves; the `version` commands produce all content." — [CLI: skills](https://www.specsplugin.com/cli/commands/skills/). The repo also has `.claude/commands` and "Claude Code agent skills for ADR lifecycle management (`/specs.adr.create`, `/specs.adr.implement`, `/specs.adr.accept`)". — [GitHub DirectedEdges/specs](https://github.com/DirectedEdges/specs)
- **MCP, conflicting evidence.** The Terms of Service describe "@directededges/specs-cli — A command-line interface and MCP server for design system operations". — [Terms of Service](https://www.specsplugin.com/overview/terms-of-service/). The CLI's 0.1.0 release (2026-02-10) reads "Initial CLI and MCP server for design system operations". — [Releases](https://www.specsplugin.com/overview/releases/). But the 0.31.0 package depends only on `ws`, `yaml`, `tslib`, `fs-extra`, `commander` and the four `@directededges/*` packages, with no MCP SDK. — [npm: specs-cli](https://registry.npmjs.org/@directededges%2Fspecs-cli). Its 457 KB `dist/specs.js` bundle contains zero occurrences of "mcp", which I checked by downloading and searching the npm tarball. The current docs list no MCP command. — [CLI Overview](https://www.specsplugin.com/cli/)
- **GitHub Actions.** The workflows page has a `.github/workflows/generate-specs.yml` recipe with `schedule: cron: '0 2 * * *'` and `workflow_dispatch`. `render` is "inherently interactive… and isn't a fit for CI/CD." — [CLI Workflows](https://www.specsplugin.com/cli/workflows/)
- **Bridge.** "the background process that relays requests between the CLI and a connected Specs 2 Figma plugin. `render` sends specs into the live file through it, and `generate --from-bridge` reads specs back out of the current selection." — [CLI: bridge](https://www.specsplugin.com/cli/commands/bridge/)
- **Code transforms.** `specs react` and `specs webcomponents` emit `contract.ts` ("The props interface, the enums those props draw from, and a defaults constant. Shared by both targets."), `scaffold.tsx`/`.ts`, `styles.css`, `stories.tsx`/`.ts` ("Storybook CSF — controls typed from the contract, a story per variant axis, a sticker sheet"), `cssvars.css`, `modes.json`, `metadata.ts` (slot shapes and visibility rules, "kept readable for tooling that reasons about the component without parsing JSX") and `api.ts` (Web Components tag, parts, element-tag map). — [Code: What gets emitted](https://www.specsplugin.com/code/)
- **Contract example.**
  ```ts
  export interface CheckboxProps { checked?: CheckboxChecked; validation?: CheckboxValidation; disabled?: boolean; size?: CheckboxSize; label?: string | null; helpText?: string | null; }
  export const CheckboxDefaults = { … } satisfies CheckboxProps;
  ```
  Roles add props that are not in the spec, for example `onPressedChange` for `togglebutton`. `invalidPropCombinations` becomes "nothing. Not a prop. It constrains which combinations the stories emit." — [Code: Contract](https://www.specsplugin.com/code/contract/)
- **Plugin to LLM.** "Copy spec data directly into LLM chats for AI-assisted development." — [Figma Community search API](https://www.figma.com/api/search/resources?query=nathan%20curtis&resource_type=plugin&sort=relevancy&price=all&creators=all). The `props` analyzer is "Designed as structured input for LLM-assisted API governance analysis." — [Releases](https://www.specsplugin.com/overview/releases/)
- **Storybook** appears only as a code-generation target (CSF stories) and as HMR context. The docs make no reference to Storybook manifests or `@storybook/addon-mcp`. — [Code: What gets emitted](https://www.specsplugin.com/code/), [Releases](https://www.specsplugin.com/overview/releases/)
- **No public hosted API.** Processing is local. The only network call is license validation: "Directed Edges does not collect, transmit, or store your design system data." — [Terms of Service](https://www.specsplugin.com/overview/terms-of-service/)

### Inferences
- An agent's route to Specs data today is file-based: YAML/JSON in a repo that a CI job regenerates, or text pasted from the plugin. This works with any agent framework, AG-UI included, but only as build-time input. A team wanting runtime access would have to wrap the generated files in its own MCP server, or compile them into AG-UI tool definitions, itself.
- The ToS's MCP-server wording appears stale relative to the shipped package.

### Gaps
- I could not confirm whether an MCP server ever shipped publicly. The 0.1.0 CLI (2026-02-10) predates the npm package's creation (2026-04-06), so it may have shipped under earlier "anova" package names that are no longer on npm (`@directededges/anova` returns "Not found").
- The docs mention Figma Code Connect nowhere. A text search of the full docs mirror found no hits. I did not check whether Specs can emit Code Connect files.

## 6. How Specs data compares with other component-metadata sources an agent could use

### Takeaway
Storybook manifests, react-docgen, Custom Elements Manifest and Code Connect describe the **implemented code surface**: import paths, typed props, events, slots, CSS parts, rendered usage snippets. Specs describes the **designed intent** extracted from Figma, which none of them record:
- named anatomy elements with types
- variant-exhaustive styling as layered deltas bound to DTCG-style token references
- the layout tree
- invalid prop combinations
- slot allow-lists and cardinality
- designer-annotated roles and actions
- ready-made composition examples

For an agent limited to a component catalog at runtime, Specs is best treated as a source of tighter constraints to merge into a code-derived schema. It does not replace one.

### Cited Findings
- **Storybook 10 manifests** (`/manifests/components.json`) are "auto-generated from static analysis of CSF files plus react-docgen prop extraction, containing per-component name, description, path, import statement, props with JSDoc descriptions, and per-story rendered snippets". The docs toolset is "React-only today", and the manifest schema is "not yet stable and should not be considered a public API". — [Storybook AI docs / MCP (via State of AI in Design Systems platform record)](https://storybook.js.org/docs/ai/mcp)
- **The react-docgen block inside a manifest** carries, per prop, `required`, `tsType`, `description` and `defaultValue { value, computed }`. — [Storybook Manifests](https://storybook.js.org/docs/ai/manifests)
- **Figma Code Connect** maps Figma properties to code props: `figma.connect(Button, url, { props: { label: figma.string('Text Content'), disabled: figma.boolean('Disabled'), type: figma.enum('Type', {Primary:'primary', …}) }, example: … })`. — [Code Connect (React)](https://developers.figma.com/docs/code-connect/react/)
- **Custom Elements Manifest** (`schemaVersion`, `modules` → `declarations`) records per custom element `tagName`, `attributes`, `events`, `slots`, `cssParts`, `cssProperties`, `cssStates` and `members`. — [custom-elements-manifest schema.d.ts](https://raw.githubusercontent.com/webcomponents/custom-elements-manifest/main/schema.d.ts), [custom-elements-manifest repo](https://github.com/webcomponents/custom-elements-manifest)
- **AG-UI tools.** A tool is `name`, `description` and `parameters`, where `parameters` "uses JSON Schema to define the structure of arguments". Frontend tools are passed through `RunAgentInput.tools`. — [AG-UI Tools](https://docs.ag-ui.com/concepts/tools)
- **Specs' own claims.** "Specs describe components in neutral terms — token references, element types, layout rules — not Figma layer names or React prop signatures." — [About Specs](https://www.specsplugin.com/overview/aboutspecs/). Curtis concedes "My Specs' layout echoes Figma's layer hierarchy" and the "Variants" structure is biased "by name (towards Figma) and model (towards web)". — [Component Contracts and Schemas](https://nathanacurtis.substack.com/p/component-contracts-and-schemas)
- **Specs deliberately excludes usage docs.** "prop tables and 'how to use' React, iOS and Android originate more appropriately from coded implementations." — [Spec-Driven UI Component Development](https://nathanacurtis.substack.com/p/spec-driven-ui-component-development)
- **Examples.** Specs' `instanceExamples` come from "ready-made instances… matching particular naming patterns and/or parents in the Figma page (like a frame or section named 'Examples')". `slotContentExamples` cover slot compositions. — [Component Examples as Data](https://nathanacurtis.substack.com/p/component-examples-as-data). Both are Pro-only. — [Schema: Component](https://www.specsplugin.com/schema/component/)

### Inferences
Comparison (built from the findings above):

| Knowledge an agent may need | Specs 2 | Storybook manifest / react-docgen | Custom Elements Manifest | Code Connect |
|---|---|---|---|---|
| Import path / tag name | No | Yes (`import`) | Yes (`tagName`, modules) | Yes (component reference) |
| Prop names, types, defaults | Yes, from Figma props; closed enums; nullability | Yes, from TS types/JSDoc | Yes (attributes/members) | Partial (mapped props only) |
| Events/callbacks | Only role- or action-derived (e.g. `onDismiss`) | Yes (function props) | Yes (`events`) | No |
| Named anatomy elements with types | **Yes** | No | Partial (`cssParts`, `slots`) | No |
| Per-variant styling with token refs | **Yes (Pro)** | No | Partial (`cssProperties` names only) | No |
| Invalid prop combinations | **Yes (Pro)** | No | No | No |
| Slot allow-list and min/max children | **Yes** (when conventions declared) | No | Slot names only | No |
| Interaction roles / a11y semantics | Yes, if designers annotate (`role`, opt-in) | No (tests via addon-mcp) | No | No |
| Usage snippets / how-to-use prose | Examples (Pro); no prose | **Yes** (story snippets, JSDoc) | Descriptions | **Yes** (`example`) |
| Figma provenance (node IDs) | **Yes** | No | No | Yes (URL) |
| Stability of format | Pre-1.0 (0.34.0), 18 versions in ~6 months | "not yet stable… not a public API" | `schemaVersion` 2.1.0 | Stable API |

- What Specs uniquely knows is design intent that code metadata leaves implicit or loses: which prop combinations the design never drew, which components a slot may hold and how many, which named element is the label, control or error message, and which token each element uses in each state.
- For AG-UI frontend tools or a generative-UI renderer catalog, a practical pattern is to take component identity, import and runtime props from code metadata (Storybook, CEM or TS types). Then tighten that JSON Schema with Specs-derived constraints: enum lists and defaults, `invalidPropCombinations` as `not` clauses, SlotProp `anyOf`/`minChildren`/`maxChildren` as array item constraints, and roles as descriptions. This merge is my inference. No tool found implements it.
- Three risks follow from the findings above. Figma prop names may diverge from code prop names; Specs' key formatting and `$extensions.com.figma.name` help but do not map to code. Pro gating means a free spec lacks the most constraining fields. The schema's rapid pre-1.0 churn is the third.

### Gaps
- No published mapping from Specs specs to JSON Schema tool definitions, Storybook manifests, CEM or Code Connect was found.
- No independent (non-Directed Edges) evaluation of Specs output quality or adoption was found. Claims such as "design systems of enterprise scale are using this as a primary Figma-to-code input" are Curtis's own and unverified. — [Figma Component Specs on Command](https://nathanacurtis.substack.com/p/figma-component-specs-on-command)
