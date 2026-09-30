# AG-UI (Agent-User Interaction) protocol, specification 1.0: how it works, and where it sits for design-system-constrained UI generation

Research date: 2026-09-30. Spec 1.0 shipped with the SDKs on 2026-09-17 (npm `@ag-ui/core`/`@ag-ui/client`/`@ag-ui/encoder` 1.0.0), and 1.0.1 followed on 2026-09-29. GitHub source was read at commit `4c972f8` (2026-09-30) of `ag-ui-protocol/ag-ui`. docs.ag-ui.com pages were fetched as their Mintlify `.md` variants (same content as the HTML page). The URLs below are the canonical page URLs.

Conventions: identifiers are quoted exactly as the spec and schema spell them. "Spec" means the normative pages under `/spec/1.0/`. "Concepts" pages (`/concepts/*`) are informative and sometimes predate 1.0. Where the two disagree, the disagreement is flagged.

---

## 1. Architecture: roles, run lifecycle, invocation (RunAgentInput), transports, capability discovery, what changed in 1.0

### Takeaway
AG-UI 1.0 is a request/stream protocol. The application sends exactly one `RunAgentInput` (typically an HTTP POST), and the agent answers with one ordered stream of typed JSON events bracketed by `RUN_STARTED` … `RUN_FINISHED`/`RUN_ERROR`. There is no mid-run channel back from the client. Everything the client "says" (tool results, resume answers, edited state) travels in the next run's input. Version 1.0 is the first release with a normative behavioral specification (BCP 14 language) and a single generated JSON Schema. It adds run outcomes (success/interrupt/cancelled), interrupt/resume, subagents, reasoning (replacing `THINKING_*`), activity events, a specified protobuf binding, in-band version negotiation, and a schema-defined `AgentCapabilities` shape, but no standard way to retrieve capabilities.

### Cited Findings

**Roles and components**
- The architecture defines four components. The **application** "Owns the user. It renders the stream, executes the tool calls it advertised, keeps the state the agent shares with it, and decides what requires the user's consent." The **client** is "The consumer's protocol machinery, usually an SDK. It sends the run input, runs the processing pipeline over what comes back — compatibility translation, middleware, enforcement, chunk expansion, verification — and hands the application a stream it can trust." The **agent endpoint and its bridge**: "A bridge translates a framework's native events into protocol events; the endpoint speaks a transport binding. The protocol carries no framework concepts." **Middleware** is "Code either side installs into the client's pipeline. It sees every event **before** enforcement strips anything." — [Architecture 1.0](https://docs.ag-ui.com/spec/1.0/architecture)
- Normative roles: a **producer** "is whatever emits the event stream — an agent, a proxy, a bridge, a test double", and a **consumer** "is whatever reads it — a client SDK, a UI, a recorder, another proxy". Conformance "is judged per stream". — [Specification 1.0 index](https://docs.ag-ui.com/spec/1.0/index)
- Division of authority: "The schema is authoritative for structure … This document is authoritative for behaviour." The schema lives at `https://ag-ui.com/spec/1.0/schema.json` (JSON Schema draft 2020-12, with every definition reachable by `$anchor`, e.g. `#RunAgentInput`). — [Specification 1.0](https://docs.ag-ui.com/spec/1.0/index); [Schema files](https://docs.ag-ui.com/spec/1.0/schema-files)
- The schema is strict (it closes objects), but "A *runtime* consumer does the opposite — it accepts unrecognised material and strips it … Do not wire the strict schema into a receive path and call the result conformance." — [Schema files](https://docs.ag-ui.com/spec/1.0/schema-files)
- Design principles, quoted: "The mandatory surface is the run lifecycle and nothing else"; "Everything observable is in the exchange"; "Tolerant reader, strict writer"; "Middleware runs before enforcement"; "Transports are bindings. Semantics never vary by wire." — [Architecture 1.0](https://docs.ag-ui.com/spec/1.0/architecture)
- Three first-party SDKs: "AG-UI is maintained with three first-party SDKs — TypeScript, Python and .NET … Other language bindings are community-maintained." — [Specification 1.0](https://docs.ag-ui.com/spec/1.0/index)

**The run and its lifecycle**
- "A stream MUST begin with `RUN_STARTED` or `RUN_ERROR`." After a run closes, a producer "MUST NOT emit any further event for that run", except that it "MAY emit `RUN_STARTED` to begin a new run on the same stream" or "MAY emit `RUN_ERROR` after `RUN_FINISHED`" (a late failure). "A consumer MUST reject any other event that arrives after a run has closed." — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle)
- `RUN_FINISHED.outcome` is one of `{type:"success", pendingToolCallIds?}`, `{type:"interrupt", interrupts:[Interrupt]}` or `{type:"cancelled"}`. An absent outcome means success. A producer that stops a run on purpose "MUST close it with `RUN_FINISHED` carrying the cancelled outcome." A consumer that drops the connection has a *truncated* run and "MUST NOT synthesize a `RUN_FINISHED`". — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle); [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- `RUN_FINISHED` requires everything the run opened to be closed. "A new run starts with nothing open." A stream MAY carry several runs, as when a replayed thread is followed by the requested run. A producer restating history "MUST restate it as snapshots". — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle)
- Two failure kinds are kept apart. A stream the consumer rejects (a protocol violation) is one. A run that reports its own `RUN_ERROR` is the other: "a conforming producer saying its work did not succeed." — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle)
- Token usage (`usage: TokenUsage[]` on `RUN_FINISHED`/`RUN_ERROR`, with fields `provider`, `model`, `inputTokens`, `outputTokens`, `totalTokens`, `reasoningTokens`, `cachedInputTokens`, `cacheWriteInputTokens`) follows the run boundary. Subagents' usage counts toward the run. Usage of a child run named by `parentRunId`, or of a resumed run, does not. — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle); [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Steps: `STEP_STARTED`/`STEP_FINISHED` match by `stepName`. They "MAY overlap each other and anything else in the run; a step is a label over a span of the stream, not a container." — [Runs and Steps](https://docs.ag-ui.com/spec/1.0/events/lifecycle)

**How an agent is invoked: `RunAgentInput`**
- "Exactly one message flows the other way: `RunAgentInput`, sent once to open each exchange." — [Run Input](https://docs.ag-ui.com/spec/1.0/basic/run-input)
- Schema fields (* = required): `*threadId: string`, `*runId: string`, `protocolVersion: string`, `parentRunId: string`, `state: State` (any JSON), `*messages: Message[]`, `tools: Tool[]`, `context: Context[]`, `forwardedProps` (any JSON except whole `null`), `resume: ResumeEntry[]`. — [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Field obligations, quoted from the spec:
  - `threadId`/`runId`: both required. `parentRunId` "names the run that spawned this one, when an agent starts another agent as a separate run."
  - `messages`: "A producer MUST treat it as the complete history it is being shown — the protocol has no side channel through which earlier turns arrive." Activity messages "never travel back to the producer: a consumer MUST strip them from `messages` before sending."
  - `tools`: "The application's own tools — *frontend tools* — offered to the agent for this run: name, description and, where the tool takes arguments, a parameter schema." "An absent list and an empty list mean the same thing."
  - `context`: "Information the application wants in the agent's context, as description–value pairs. It exists to be *injected*: a producer SHOULD make every entry available to the model."
  - `state`: "The state the run starts from — the consumer's last agreed value … An absent `state` means the empty object."
  - `forwardedProps`: "An application-specific channel passed through to the agent untouched … intermediaries MUST NOT alter it."
  - `resume`: "Answers to the interrupts that ended a previous run."
  - Malformed input "is rejected before `RUN_STARTED`, through the transport's error path". Unrecognized members are stripped with a warning.
  — [Run Input](https://docs.ag-ui.com/spec/1.0/basic/run-input)
- A producer "MAY echo the input back on `RUN_STARTED.input`". — [Run Input](https://docs.ag-ui.com/spec/1.0/basic/run-input)
- `Context` is `{*description: string, *value: string}`, so context values are strings and structured catalogs must be serialized. — [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Identifiers: `threadId` is "minted by the application and is stable across runs". `runId` "MUST NOT be reused". `messageId` "MUST be unique within its thread". "All identifiers are opaque strings." — [The Event Model](https://docs.ag-ui.com/spec/1.0/basic/index)
- "Absent means absent": "An optional field that has no value MUST be omitted rather than sent as `null`." — [The Event Model](https://docs.ag-ui.com/spec/1.0/basic/index)

**Transports**
- A binding must provide ordered, complete delivery; delivery of the `RunAgentInput` before any events; a termination signal distinguishable from truncation; and an error path for rejected input. "AG-UI defines no credential." — [Transports](https://docs.ag-ui.com/spec/1.0/basic/transports/index)
- Standard bindings: (1) HTTP + SSE and (2) HTTP + Protobuf. "An implementation that speaks HTTP MUST support the SSE binding; the protobuf binding is OPTIONAL." — [Transports](https://docs.ag-ui.com/spec/1.0/basic/transports/index)
- SSE binding: the client sends `POST` with a JSON body, `Content-Type: application/json` and `Accept: text/event-stream`. The response is `200` with `Content-Type: text/event-stream`. "Each SSE event's `data` payload is exactly one protocol event as a JSON object". The producer "MUST frame the stream with LF (`\n`) line endings". The consumer "MUST ignore SSE fields other than `data`" and tolerate `: keep-alive` comments. The binding has no resumption: "SSE's `Last-Event-ID` mechanism is not used". Failures after the stream opens travel as `RUN_ERROR`, and "a consumer MUST NOT infer success from `200` alone." — [HTTP + SSE](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse)
- Protobuf binding: negotiated by `Accept` including `application/vnd.ag-ui.event+proto`. Each frame is "a 4-byte length header — an unsigned 32-bit big-endian integer — followed by exactly that many bytes of one encoded event". The request half is the same JSON POST. The protobuf definitions are "generated from the same JSON Schema". "a corpus of canonical events pins the encoded bytes, and every first-party encoder MUST reproduce the corpus byte for byte." — [HTTP + Protobuf](https://docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf)
- WebSockets are **not** a standard binding in 1.0: "Implementations MAY carry AG-UI over other channels — WebSockets, message buses, in-process pipes. A custom transport MUST preserve the event model … SHOULD frame events exactly as the SSE binding does." — [Transports](https://docs.ag-ui.com/spec/1.0/basic/transports/index). The `AgentCapabilities.transport` group still has a `websocket?: boolean` flag ("Set true if the agent accepts persistent WebSocket connections"). — [schema.json](https://ag-ui.com/spec/1.0/schema.json); [Capabilities concept](https://docs.ag-ui.com/concepts/capabilities)
- Informative concept pages still describe transport more loosely. The introduction says AG-UI "builds on top of the foundational protocols of the web (HTTP, WebSockets)". — [AG-UI Overview](https://docs.ag-ui.com/introduction)

**Processing model (what a client must do with the stream)**
- "Unrecognised material is not an error. A malformed known value is." An unknown event type is dropped with a warning. An unknown property or union member is stripped with a warning. "A field the protocol DOES describe, carrying a value the schema rejects, MUST be fatal." — [Processing Model](https://docs.ag-ui.com/spec/1.0/basic/processing)
- Canonical pipeline: `producer → compatibility boundary → middleware → enforcement → chunk expansion → verification → application`. "A consumer MUST apply this ordering on every path … including reconnection and replay." — [Processing Model](https://docs.ag-ui.com/spec/1.0/basic/processing)
- Known gap in the reference implementation: a closed-set string field such as a message `role` "is checked as a leaf, so an unrecognised value there is fatal rather than stripped." Python and .NET models "parse leniently with no stage that strips before application code." — [Processing Model](https://docs.ag-ui.com/spec/1.0/basic/processing)
- A producer "MUST NOT emit an event type the protocol does not describe in the expectation that consumers will ignore it … `CUSTOM` and `RAW` exist for that." — [Processing Model](https://docs.ag-ui.com/spec/1.0/basic/processing)

**Versioning**
- Version negotiation is in-band. The consumer declares `RunAgentInput.protocolVersion`, and the producer declares its own on `RUN_STARTED.protocolVersion`. Values are `MAJOR.MINOR` compared numerically. A producer "MUST serve" a newer minor of its line, and "MAY reject, before `RUN_STARTED`, only a declaration from a major line it does not implement." — [Versioning and Compatibility](https://docs.ag-ui.com/spec/1.0/basic/versioning)
- The TS SDK constant is `PROTOCOL_VERSION = "1.0"`. — [core/src/generated/version.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/core/src/generated/version.ts)
- A lossy downgrade "MUST emit a warning that names what was lost". Retired shapes are recorded in a deprecation registry and translated by middleware before enforcement. — [Versioning and Compatibility](https://docs.ag-ui.com/spec/1.0/basic/versioning)
- Deprecation registry: "Every shim below shipped in 1.0, released on 2026-09-17, and every date is twelve months from that release". `THINKING_*` → `REASONING_*`, `{type:"binary"}` content parts → media parts, and `null` optional fields are all shimmed until 2027-09-17. — [DEPRECATIONS.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/DEPRECATIONS.md)

**Capability discovery**
- `AgentCapabilities` groups: `identity`, `transport`, `tools`, `output`, `state`, `multiAgent`, `reasoning`, `multimodal`, `execution`, `humanInTheLoop`, `custom`. "An omitted field means undeclared, not unsupported." "Declarations are informative, not binding. The event stream is authoritative." — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
- Retrieval is deliberately unspecified: "No transport binding in this version carries a capabilities exchange … whether an agent's capabilities are read from a method on a client-side agent object, fetched from an application-defined endpoint, or configured statically is the implementation's business." — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
- In the TS SDK, `AbstractAgent` has an optional `getCapabilities?(): Promise<AgentCapabilities>`. It is implemented by subclasses such as LangGraph and ADK, "not by the bare `HttpAgent`, which is a transport and has no discovery endpoint to ask." — [Capabilities concept](https://docs.ag-ui.com/concepts/capabilities); [AbstractAgent](https://docs.ag-ui.com/sdk/js/client/abstract-agent)
- Schema field sets: `ToolsCapabilities{supported, items: Tool[], parallelCalls, clientProvided}`, `OutputCapabilities{structuredOutput, supportedMimeTypes}`, `StateCapabilities{snapshots, deltas, memory, persistentState}`, `TransportCapabilities{streaming, websocket, httpBinary, pushNotifications, resumable}`, `HumanInTheLoopCapabilities{supported, approvals, interventions, feedback, interrupts, approveWithEdits}`, `MultimodalCapabilities{input{image,audio,video,pdf,file}, output{image,audio}}`. — [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- `tools.items` "lists the tools the *agent* provides … and is distinct from `RunAgentInput.tools` … The two never merge." `output.structuredOutput`: "this version of the protocol has no field through which a consumer supplies [a schema] and no event that identifies output as structured." `multimodal.output`: "this version of the protocol defines no image or audio output". — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)

**What changed in 1.0 vs 0.x (from the official changelog)**
- The major changes, quoted:
  1. "The specification exists. 0.x defined shapes; behaviour lived in the TypeScript client."
  2. "Runs report how they ended" (`outcome`, `Interrupt`, `resume`, cancelled).
  3. "Subagents" (`subagentRunId`, `SUBAGENT_STARTED/FINISHED/ERROR`).
  4. "Reasoning replaces thinking" (`THINKING_*` retired; `REASONING_ENCRYPTED_VALUE`).
  5. "Activity events" (`ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA`).
  6. "Unknown versus malformed, normatively."
  7. "The chunked form has rules."
  8. "A binary wire" (protobuf).
  9. "Capabilities are in the schema" (`subAgents` → `subagents`).
  10. "Tool results carry content parts" (`InputContent` → `ContentPart`, `TextInputContent` → `TextPart`, and so on; wire unchanged).
  — [Key Changes](https://docs.ag-ui.com/spec/1.0/changelog)
- Minor changes include:
  - `tools`/`context` optional.
  - Metadata merge normative, with the `ag-ui` key reserved.
  - "Absent means absent".
  - Token usage.
  - "A run that stops on a frontend tool call finishes as success, never as an interrupt … `pendingToolCallIds`".
  - Multimodal input parts, including a new `file` source.
  - `TOOL_CALL_RESULT` "does not reopen the call".
  - Late `RUN_ERROR` admitted.
  - In-band `protocolVersion`.
  — [Key Changes](https://docs.ag-ui.com/spec/1.0/changelog)
- Migration notes for TypeScript:
  - Zod validators moved to the subpath `@ag-ui/core/schemas`, and `@ag-ui/core` main is "types and constants only".
  - "Unknown material no longer reaches your code". Non-standard properties are stripped before subscribers see them, and "The sanctioned channel for extra data is `metadata`".
  - Reasoning open/close discipline is now verified.
  - Retired: `THINKING_*`, `BinaryInputContent`, `stripUnknown`/`StripResult`.
  - Renamed: `SubAgentInfo` → `SubagentInfo`.
  - "A 0.x agent keeps working against a 1.0 client" and vice versa.
  — [Migrating to 1.0](https://docs.ag-ui.com/migrating-to-1-0)
- Release dates:
  - npm `@ag-ui/core` 1.0.0: 2026-09-17T18:27Z; 1.0.1: 2026-09-29.
  - `@ag-ui/client` 1.0.0: 2026-09-17; 1.0.1: 2026-09-29.
  - `@ag-ui/encoder`: same dates as core and client.
  - Last 0.x release: 0.0.59 on 2026-08-27.
  - `@ag-ui/core` was created 2025-04-30.
  — [npm registry @ag-ui/core](https://registry.npmjs.org/@ag-ui/core); [npm registry @ag-ui/client](https://registry.npmjs.org/@ag-ui/client); [npm registry @ag-ui/encoder](https://registry.npmjs.org/@ag-ui/encoder)
- The public "What's New" page has only one entry, dated 2025-04-09 ("AG-UI repositories are now public"), and no 1.0 entry. — [What's New](https://docs.ag-ui.com/development/updates)

### Inferences
- For a design-system team, the protocol's "one input in, one stream out, no mid-run back-channel" shape fixes the loop's granularity. Every human or design-tool contribution (a designer's edit, a Figma-side selection, a validation failure from the renderer) re-enters the agent only at the next run boundary, through `messages` (tool results), `state`, `context`, `forwardedProps` or `resume`.
- The spec says nothing on how the agent should use `context`, and `Context.value` is a string. A design-system catalog sent via `context` is therefore "just prompt material", with no protocol-level guarantee that the agent obeys it.
- Capabilities are useful for UI shaping but not for trust, because the spec says the stream is authoritative. The only enforceable contract between a design system and an agent is the client-side validation the application does itself.

### Gaps
- There is no official 1.0 release announcement or blog post on docs.ag-ui.com. The "What's New" page was not updated, and the GitHub Releases page was not checked.
- I could not verify a formal governance body (see Section 7).

### Pages read (source log)
- docs.ag-ui.com spec 1.0:
  - [/spec/1.0/architecture](https://docs.ag-ui.com/spec/1.0/architecture), [/spec/1.0/index](https://docs.ag-ui.com/spec/1.0/index), [/spec/1.0/changelog](https://docs.ag-ui.com/spec/1.0/changelog)
  - [/spec/1.0/basic/index](https://docs.ag-ui.com/spec/1.0/basic/index), [/spec/1.0/basic/run-input](https://docs.ag-ui.com/spec/1.0/basic/run-input), [/spec/1.0/basic/metadata](https://docs.ag-ui.com/spec/1.0/basic/metadata), [/spec/1.0/basic/capabilities](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
  - [/spec/1.0/basic/patterns/streaming](https://docs.ag-ui.com/spec/1.0/basic/patterns/streaming), [/spec/1.0/basic/patterns/snapshots](https://docs.ag-ui.com/spec/1.0/basic/patterns/snapshots), [/spec/1.0/basic/patterns/interrupt-resume](https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume)
  - [/spec/1.0/basic/transports/index](https://docs.ag-ui.com/spec/1.0/basic/transports/index), [/spec/1.0/basic/transports/http-sse](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse), [/spec/1.0/basic/transports/http-protobuf](https://docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf)
  - [/spec/1.0/basic/processing](https://docs.ag-ui.com/spec/1.0/basic/processing), [/spec/1.0/basic/versioning](https://docs.ag-ui.com/spec/1.0/basic/versioning)
  - [/spec/1.0/events/index](https://docs.ag-ui.com/spec/1.0/events/index), [/spec/1.0/events/lifecycle](https://docs.ag-ui.com/spec/1.0/events/lifecycle), [/spec/1.0/events/text-messages](https://docs.ag-ui.com/spec/1.0/events/text-messages), [/spec/1.0/events/tool-calls](https://docs.ag-ui.com/spec/1.0/events/tool-calls), [/spec/1.0/events/reasoning](https://docs.ag-ui.com/spec/1.0/events/reasoning) (skimmed), [/spec/1.0/events/state](https://docs.ag-ui.com/spec/1.0/events/state), [/spec/1.0/events/activity](https://docs.ag-ui.com/spec/1.0/events/activity), [/spec/1.0/events/subagents](https://docs.ag-ui.com/spec/1.0/events/subagents) (skimmed), [/spec/1.0/events/passthrough](https://docs.ag-ui.com/spec/1.0/events/passthrough)
  - [/spec/1.0/schema-files](https://docs.ag-ui.com/spec/1.0/schema-files); the schema itself at [schema.json](https://ag-ui.com/spec/1.0/schema.json), parsed programmatically
- docs.ag-ui.com concepts, drafts and SDK pages:
  - [/introduction](https://docs.ag-ui.com/introduction), [/agentic-protocols](https://docs.ag-ui.com/agentic-protocols), [/migrating-to-1-0](https://docs.ag-ui.com/migrating-to-1-0)
  - [/concepts/tools](https://docs.ag-ui.com/concepts/tools), [/concepts/state](https://docs.ag-ui.com/concepts/state), [/concepts/capabilities](https://docs.ag-ui.com/concepts/capabilities), [/concepts/interrupts](https://docs.ag-ui.com/concepts/interrupts) (partially), [/concepts/events](https://docs.ag-ui.com/concepts/events) (partially), [/concepts/generative-ui-specs](https://docs.ag-ui.com/concepts/generative-ui-specs)
  - [/drafts/overview](https://docs.ag-ui.com/drafts/overview), [/drafts/generative-ui](https://docs.ag-ui.com/drafts/generative-ui), [/drafts/meta-events](https://docs.ag-ui.com/drafts/meta-events)
  - [/sdk/js/client/overview](https://docs.ag-ui.com/sdk/js/client/overview), [/sdk/js/client/abstract-agent](https://docs.ag-ui.com/sdk/js/client/abstract-agent), [/sdk/js/client/http-agent](https://docs.ag-ui.com/sdk/js/client/http-agent), [/sdk/js/client/subscriber](https://docs.ag-ui.com/sdk/js/client/subscriber), [/sdk/js/encoder](https://docs.ag-ui.com/sdk/js/encoder) (empty page), [/sdk/js/proto](https://docs.ag-ui.com/sdk/js/proto) (empty page)
  - [/quickstart/server](https://docs.ag-ui.com/quickstart/server), [/quickstart/middleware](https://docs.ag-ui.com/quickstart/middleware), [/quickstart/clients](https://docs.ag-ui.com/quickstart/clients)
  - [/development/updates](https://docs.ag-ui.com/development/updates), [/development/roadmap](https://docs.ag-ui.com/development/roadmap), [/support](https://docs.ag-ui.com/support), [/talk-to-us](https://docs.ag-ui.com/talk-to-us)
  - The full page index is [llms.txt](https://docs.ag-ui.com/llms.txt). All 86 pages listed there were downloaded, and the ones above were read.
- GitHub `ag-ui-protocol/ag-ui` (commit 4c972f8, 2026-09-30):
  - [DEPRECATIONS.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/DEPRECATIONS.md)
  - [client/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/index.ts), [client/src/agent/agent.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/agent.ts), [client/src/agent/types.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/types.ts), [client/src/agent/subscriber.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/subscriber.ts), [client/src/verify/verify.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/verify/verify.ts), [client/src/legacy/convert.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/legacy/convert.ts), [client/CHANGELOG.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/CHANGELOG.md)
  - [encoder/src/encoder.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/encoder/src/encoder.ts), [encoder/README.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/encoder/README.md), [core/package.json](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/core/package.json), [proto/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/proto/src/index.ts)
  - [middlewares/a2ui-middleware/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/src/index.ts), [types.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/src/types.ts), [CHANGELOG.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/CHANGELOG.md)
  - [middlewares/mcp-apps-middleware/README.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/mcp-apps-middleware/README.md), [src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/mcp-apps-middleware/src/index.ts)
  - [a2ui-toolkit/README.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/a2ui-toolkit/README.md)
  - [integrations/langgraph/python/ag_ui_langgraph/middlewares/state_streaming.py](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/langgraph/python/ag_ui_langgraph/middlewares/state_streaming.py), [agent.py](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/langgraph/python/ag_ui_langgraph/agent.py)
  - [integrations/claude-agent-sdk/typescript/examples/server.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/claude-agent-sdk/typescript/examples/server.ts)
  - Repo layout (`integrations/`, `middlewares/`, `sdks/`)
- External:
  - npm registry: [@ag-ui/core](https://registry.npmjs.org/@ag-ui/core), [@ag-ui/client](https://registry.npmjs.org/@ag-ui/client), [@ag-ui/encoder](https://registry.npmjs.org/@ag-ui/encoder), [@ag-ui/a2ui-middleware](https://registry.npmjs.org/@ag-ui/a2ui-middleware), [@ag-ui/mcp-apps-middleware](https://registry.npmjs.org/@ag-ui/mcp-apps-middleware)
  - npm downloads API: [@ag-ui/client](https://api.npmjs.org/downloads/point/last-week/@ag-ui/client), [@ag-ui/core](https://api.npmjs.org/downloads/point/last-week/@ag-ui/core)
  - CopilotKit docs: [llms.txt](https://docs.copilotkit.ai/llms.txt), [generative UI overview](https://docs.copilotkit.ai/concepts/generative-ui-overview), [A2UI](https://docs.copilotkit.ai/generative-ui/a2ui), [A2UI fixed schema](https://docs.copilotkit.ai/generative-ui/a2ui/fixed-schema), [MCP Apps](https://docs.copilotkit.ai/generative-ui/mcp-apps), [components as tools](https://docs.copilotkit.ai/generative-ui/tool-based)
  - [A2UI v0.9 spec](https://a2ui.org/specification/v0.9-a2ui/), [SEP-1865](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp), [AAIF projects](https://aaif.io/projects/), [Pulse 2.0 Series A article](https://pulse2.com/copilotkit-27-million-series-a-raised-for-enterprise-agentic-frontend-stack/)
  - Community repos: [golevishal/agui-cloudscape-renderer](https://github.com/golevishal/agui-cloudscape-renderer), [aestheticfunction/dspack-studio](https://github.com/aestheticfunction/dspack-studio)
  - GitHub code and repo searches (via the GitHub API)
  - Failed: [GeekWire](https://www.geekwire.com/2026/seattles-copilotkit-raises-27m-as-some-of-the-biggest-names-in-tech-adopt-its-ai-agent-protocol/) returned HTTP 403. [copilotkit.ai/blog/series-a](https://copilotkit.ai/blog/series-a) body is JS-rendered and was not extractable.

---

## 2. Events: complete list, exact fields, ordering and validation rules

### Takeaway
1.0 defines exactly 31 event types in eight families. Every event shares the `BaseEvent` envelope: `type` (required), plus optional `timestamp`, `rawEvent` and `metadata`. Most events also carry an optional `subagentRunId`. Streaming items follow a strict open→content→close discipline keyed by `messageId`/`toolCallId`. A compact `*_CHUNK` form must be expanded by the client. Evolving values (state, activity) use snapshot and RFC 6902 JSON Patch deltas. The TS client enforces these rules in `enforceEvents` → `transformChunks` → `verifyEvents`.

### Cited Findings
- `EventType` enum, the 31 values in schema order: `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`, `TEXT_MESSAGE_CHUNK`, `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_CHUNK`, `TOOL_CALL_RESULT`, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA`, `RAW`, `CUSTOM`, `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`, `STEP_STARTED`, `STEP_FINISHED`, `REASONING_START`, `REASONING_MESSAGE_START`, `REASONING_MESSAGE_CONTENT`, `REASONING_MESSAGE_END`, `REASONING_MESSAGE_CHUNK`, `REASONING_END`, `REASONING_ENCRYPTED_VALUE`, `SUBAGENT_STARTED`, `SUBAGENT_FINISHED`, `SUBAGENT_ERROR`. — [schema.json](https://ag-ui.com/spec/1.0/schema.json); [The Event Model](https://docs.ag-ui.com/spec/1.0/basic/index)
- Envelope `BaseEvent`: `*type: EventType`, `timestamp: integer` ("a consumer MUST NOT use it to order events — arrival order is the protocol's order"; conventionally epoch milliseconds), `rawEvent` (any; "A consumer MUST NOT derive protocol behaviour from it"), `metadata: object` (open). Events other than the run-scoped ones compose `Attributable` and gain `subagentRunId?: string`. `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR` and `MESSAGES_SNAPSHOT` "carry no attribution". — [The Event Model](https://docs.ag-ui.com/spec/1.0/basic/index); [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Event-specific fields from the schema (* = required, envelope fields omitted). All event objects are closed (`unevaluatedProperties: false`). — [schema.json](https://ag-ui.com/spec/1.0/schema.json)

| Event | Fields |
|---|---|
| `RUN_STARTED` | `*threadId`, `*runId`, `protocolVersion`, `parentRunId`, `input: RunAgentInput` |
| `RUN_FINISHED` | `*threadId`, `*runId`, `result` (any), `outcome: RunFinishedOutcome`, `usage: TokenUsage[]` |
| `RUN_ERROR` | `*message`, `code`, `usage` |
| `STEP_STARTED` / `STEP_FINISHED` | `*stepName` |
| `TEXT_MESSAGE_START` | `*messageId`, `role: "developer"\|"system"\|"assistant"\|"user"` (absent = `assistant`), `name` |
| `TEXT_MESSAGE_CONTENT` | `*messageId`, `*delta` |
| `TEXT_MESSAGE_END` | `*messageId` |
| `TEXT_MESSAGE_CHUNK` | `messageId`, `role`, `delta`, `name` (all optional in schema; the first chunk MUST carry `messageId`) |
| `TOOL_CALL_START` | `*toolCallId`, `*toolCallName`, `parentMessageId` |
| `TOOL_CALL_ARGS` | `*toolCallId`, `*delta` |
| `TOOL_CALL_END` | `*toolCallId` |
| `TOOL_CALL_CHUNK` | `toolCallId`, `toolCallName`, `parentMessageId`, `delta` (the first chunk MUST carry `toolCallId` + `toolCallName`) |
| `TOOL_CALL_RESULT` | `*messageId`, `*toolCallId`, `*content: string \| ContentPart[]`, `role: "tool"` |
| `STATE_SNAPSHOT` | `*snapshot: State` (any JSON, may be `null`) |
| `STATE_DELTA` | `*delta: JsonPatch` |
| `MESSAGES_SNAPSHOT` | `*messages: Message[]` |
| `ACTIVITY_SNAPSHOT` | `*messageId`, `*activityType`, `*content: object`, `replace: boolean` |
| `ACTIVITY_DELTA` | `*messageId`, `*activityType`, `*patch: JsonPatch` |
| `REASONING_START` / `REASONING_END` | `*messageId` |
| `REASONING_MESSAGE_START` | `*messageId`, `*role: "reasoning"` |
| `REASONING_MESSAGE_CONTENT` | `*messageId`, `*delta` |
| `REASONING_MESSAGE_END` | `*messageId` |
| `REASONING_MESSAGE_CHUNK` | `messageId`, `delta` |
| `REASONING_ENCRYPTED_VALUE` | `*subtype: "tool-call"\|"message"`, `*entityId`, `*encryptedValue` |
| `SUBAGENT_STARTED` | `*subagentRunId`, `*name`, `description`, `parentSubagentRunId`, `parentToolCallId`, `parentMessageId` |
| `SUBAGENT_FINISHED` | `*subagentRunId`, `result`, `outcome: {type:"success"} \| {type:"suspended", interruptIds?}` |
| `SUBAGENT_ERROR` | `*subagentRunId`, `*message`, `code` |
| `RAW` | `*event` (any), `source` |
| `CUSTOM` | `*name`, `*value` (any) |

- Supporting types from the schema:
  - `Interrupt{*id, *reason, message, toolCallId, responseSchema: object, expiresAt, subagentRunId, metadata}`
  - `ResumeEntry{*interruptId, *status: "resolved"|"cancelled", payload, metadata}`
  - `Tool{*name, *description, parameters (opaque JSON Schema), metadata}`
  - `ToolCall{*id, *type:"function", *function{*name, *arguments: string}, encryptedValue, metadata}`
  - `Message` = one of `DeveloperMessage`, `SystemMessage`, `AssistantMessage{content?, toolCalls?}`, `UserMessage{content: string|ContentPart[]}`, `ToolMessage{*id, *content, *toolCallId, error, encryptedValue}`, `ActivityMessage{*id, role:"activity", *activityType, *content: object}`, `ReasoningMessage{*id, role:"reasoning", *content, encryptedValue}`
  - `ContentPart` = `TextPart{type:"text", text}` | `ImagePart` | `AudioPart` | `VideoPart` | `DocumentPart`, each media part with `source: DataSource{value, mimeType} | UrlSource{value, mimeType?} | FileSource{value, provider?, mimeType?}`
  — [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Streaming rules:
  - "A producer MUST NOT open an item whose identifier is already open", "MUST NOT send a content or end event for an identifier that is not open", and "Every item a producer opens MUST be closed before the run finishes."
  - Items may interleave freely.
  - Standalone events (`STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA`, `CUSTOM`, `RAW`, `REASONING_ENCRYPTED_VALUE`) "MAY appear anywhere within an open run."
  — [Streaming Messages](https://docs.ag-ui.com/spec/1.0/basic/patterns/streaming)
- Chunk rules:
  - The two spellings "do not mix within one item".
  - A continuation that repeats an opener field with a conflicting value is a protocol violation.
  - Consumers synthesize `*_END` when a different item opens in the lane, when most other events arrive in the lane (except `RAW`, `ACTIVITY_*`, `REASONING_ENCRYPTED_VALUE`, `SUBAGENT_STARTED`), or at run-level events.
  - With parallel subagents, unattributed continuations are ambiguous and "MUST be rejected".
  — [Streaming Messages](https://docs.ag-ui.com/spec/1.0/basic/patterns/streaming)
- Messages and tool calls can be reopened. A closed message "MAY reopen the same `messageId` with a new `TEXT_MESSAGE_START`", and a closed tool call "MAY be reopened by a new `TOOL_CALL_START` with the same `toolCallId`". The reopening opener must agree with the original. — [Text Messages](https://docs.ag-ui.com/spec/1.0/events/text-messages); [Tool Calls](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Patches:
  - "an array of operations applied in order, atomically".
  - A structurally malformed patch is fatal.
  - An unknown `op` is dropped with a warning.
  - A well-formed patch that fails to apply: "The consumer MUST NOT keep a partially applied result … MUST surface the failure … MAY continue with its prior value."
  - The consumer "MUST adopt the next snapshot regardless."
  - Patch operation objects are open, so extension members are preserved.
  — [Snapshots and Deltas](https://docs.ag-ui.com/spec/1.0/basic/patterns/snapshots)
- Metadata is merged "key by key, with the last write winning … The merge MUST NOT recurse." Merge targets: text events → the message; `TOOL_CALL_*` → "**the tool call itself** — not the assistant message that owns it"; `TOOL_CALL_RESULT` → the tool message; activity → the activity message. `RUN_*`, `STEP_*`, snapshots, `RAW` and `CUSTOM` merge nowhere. — [Metadata](https://docs.ag-ui.com/spec/1.0/basic/metadata)
- `CUSTOM`: "A consumer that does not recognise a `name` MUST ignore the event … Producers SHOULD prefix names they invent with a vendor or application identifier … names without a prefix are reserved for the protocol's own future use." A producer "MUST NOT rely on a `CUSTOM` event to carry semantics this specification assigns to a standard event." `RAW` is for provider-native events: "A producer SHOULD emit `RAW` alongside the standard events, never instead of them." — [Raw and Custom Events](https://docs.ag-ui.com/spec/1.0/events/passthrough)
- Reasoning: consumers "MUST treat `encryptedValue` as opaque" and store it with the entity named by `entityId`. Reasoning spans and messages are separate namespaces. — [Reasoning 1.0](https://docs.ag-ui.com/spec/1.0/events/reasoning); [Migrating to 1.0](https://docs.ag-ui.com/migrating-to-1-0)
- Subagents: an id "identifies an *invocation*, not an agent". Announced invocations must be closed by `SUBAGENT_FINISHED` or `SUBAGENT_ERROR`. — [Subagents 1.0](https://docs.ag-ui.com/spec/1.0/events/subagents)
- SDK enforcement order (TS source): the middleware chain wraps an inner `CompatibilityBoundary`, then `enforceEvents(...)`, `transformChunks(...)`, `verifyEvents(...)`, then `applyBeforeSourceError` (applies events to messages and state and calls subscribers). — [client/src/agent/agent.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/agent.ts)
- `verifyEvents` tracks open text messages, tool calls, activities and owners (for subagent attribution), and rejects out-of-order sequences. — [client/src/verify/verify.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/verify/verify.ts)
- A producer-sent `RUN_ERROR` does not reject `runAgent()`: "the event is delivered to `onRunErrorEvent`, the stream continues, and `runAgent()` resolves, exactly as in 0.x." — [Migrating to 1.0](https://docs.ag-ui.com/migrating-to-1-0)
- New in 1.0 relative to 0.x: the `REASONING_*` family (replacing five `THINKING_*` events), `SUBAGENT_*`, and outcome/usage/`protocolVersion` fields. `ACTIVITY_*` is listed as a 1.0 key change. — [Key Changes](https://docs.ag-ui.com/spec/1.0/changelog)
- Draft only (not in 1.0): a `META` event type (`MetaEvent{type: EventType.META, metaType, payload}`) for run-independent annotations such as thumbs up/down. Status "Draft", author Markus Ecker. — [Meta Events draft](https://docs.ag-ui.com/drafts/meta-events)

### Inferences
- A renderer that must be conformant has to implement a small state machine: per-id open/close tracking, chunk expansion with lane semantics, atomic JSON Patch with failure tolerance, metadata merge with per-family targets, and activity/`MESSAGES_SNAPSHOT` reconciliation. Using `@ag-ui/client` rather than hand-parsing SSE avoids reimplementing this.
- `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` (an object-content message with an open `activityType`, amended by JSON Patch) is the closest thing in the core protocol to a "UI surface" primitive. The A2UI and MCP Apps middlewares both ride on it (Section 5).

### Gaps
- I skimmed the reasoning and subagent spec pages rather than reading them fully, so their detailed nesting and parallelism rules are not captured here.

---

## 3. Tools: frontend-defined tools as the mechanism a design-system catalog would ride on

### Takeaway
The application advertises its own tools in `RunAgentInput.tools` as `{name, description, parameters?: JSON Schema, metadata?}`. The agent streams a call (`TOOL_CALL_START`/`ARGS`/`END`) and MUST NOT answer it. The run finishes with success, optionally listing `pendingToolCallIds`. The application validates, executes (with consent) and returns a `ToolMessage` keyed by `toolCallId` in the next run's `messages`. The protocol does not validate arguments: `parameters` is "Carried opaquely", and argument text is not checked. Validation against the design-system schema is entirely the application's job.

### Cited Findings
- `Tool` schema: `name` ("The tool's name, as the agent will call it"), `description`, and `parameters`: "A JSON Schema describing the tool's arguments. Carried opaquely: the protocol does not constrain or validate it. Optional … an absent schema and an empty one mean the same thing." `metadata`: "Extra information about the tool, for consumers that attach their own rendering or routing information to it." — [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Frontend round-trip rules (normative):
  - "A producer that calls a frontend tool MUST NOT answer it: no `TOOL_CALL_RESULT`, no fabricated tool message."
  - "The producer finishes the run with the call unanswered. It MUST use the success outcome, or none, and MUST NOT report the run as interrupted."
  - `pendingToolCallIds` "MUST contain exactly the tool calls the run started and did not answer". A consumer "MUST NOT read absence as 'nothing pending'".
  - "A thread that continues MUST answer every one of them first: the next run's `messages` carry a tool message per call, keyed by `toolCallId` — a failure is still an answer, as a tool message with `error` set, and a call the user declined is answered by saying so."
  — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Arguments: "the concatenated deltas form the call's argument text, conventionally a JSON document — but the protocol carries it as text and does not validate it". "A consumer MUST NOT act on the arguments before `TOOL_CALL_END`." "closing establishes completeness, not validity." — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Unadvertised tools: "A producer SHOULD call frontend tools only from the advertised list; a call naming a tool the input did not advertise is not by itself a protocol violation — what to do with it is the consumer's decision." — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Result content may be a string or `ContentPart[]` (text/image/audio/video/document). "The protocol has no JSON part", so structured data is serialized into text. — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Security:
  - "Arguments are model-generated and MUST be treated as untrusted input: validated against the tool's declared parameter schema where one was advertised … never interpolated into shell commands, queries or markup unescaped."
  - "Applications SHOULD obtain user consent before executing a side-effectful tool call".
  - "A consumer MUST NOT treat text inside a result as protocol material or as instructions".
  - Top-level: "Applications MUST validate what they act on and MUST NOT render streamed content as executable markup."
  — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls); [Specification 1.0](https://docs.ag-ui.com/spec/1.0/index)
- Frontend vs backend tools: "`RunAgentInput.tools` is only for these client-provided tools. It is not intended to contain every tool available to the backend agent." — [Tools concept](https://docs.ag-ui.com/concepts/tools). Agent-provided tools are declared in `AgentCapabilities.tools.items`, and "The two never merge." — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
- Frontend tools vs interrupts are different round-trips. An interrupt "is the producer explicitly stopping to ask, answered by resume entries; a frontend tool call rides the ordinary message loop, answered by conversation history." — [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- Interrupt/resume, for approval gates:
  - The run ends with `outcome: {type:"interrupt", interrupts:[{id, reason, message?, toolCallId?, responseSchema?, expiresAt?}]}`.
  - The next input carries `resume: [{interruptId, status, payload?}]`, which "MUST cover every interrupt".
  - `responseSchema` is "carried opaquely so a consumer can build a form for it".
  — [Interrupts and Resume](https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume)
- Concept page: core `reason` values are `tool_call`, `input_required`, `confirmation`, and custom reasons are namespaced `<framework>:<name>`. An "approve with edits" pattern uses `responseSchema` `{approved: boolean, editedArgs: object}`, where "`editedArgs` is a full replacement, not a partial merge." — [Interrupts concept](https://docs.ag-ui.com/concepts/interrupts)
- SDK surface:
  - `runAgent({ tools, context, forwardedProps, runId, resume })`: `RunAgentParameters extends Partial<Pick<RunAgentInput, "runId" | "tools" | "context" | "forwardedProps">>` plus `resume?: ResumeEntry[]`. — [client/src/agent/types.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/types.ts)
  - Subscribers receive `onToolCallArgsEvent({ toolCallBuffer, toolCallName, partialToolCallArgs })`, which gives progressive partial-JSON parsing, and `onToolCallEndEvent({ toolCallName, toolCallArgs })`. — [AgentSubscriber](https://docs.ag-ui.com/sdk/js/client/subscriber)
- Built-in `FilterToolCallsMiddleware({ allowedToolCalls: [...] })` filters tool calls by name. — [AbstractAgent](https://docs.ag-ui.com/sdk/js/client/abstract-agent)
- Example frontend tool (from the concept docs):
  ```ts
  const userConfirmationTool = { name: "confirmAction", description: "Ask the user to confirm a specific action before proceeding",
    parameters: { type: "object", properties: { action: { type: "string" }, importance: { type: "string", enum: ["low","medium","high","critical"] } }, required: ["action"] } }
  agent.runAgent({ tools: [userConfirmationTool] })
  ```
  — [Tools concept](https://docs.ag-ui.com/concepts/tools)
- Provider constraints on schemas, from the generative UI draft: "OpenAI enforces a limit of 1024 characters for tool descriptions" and "Classes, nesting, `$ref`, and `oneOf` are not reliably supported across LLM providers." — [Generative UI draft](https://docs.ag-ui.com/drafts/generative-ui)

### Inferences
- A design-system catalog maps naturally onto frontend tools. Each component (or one generic `render_component` or `render_surface` tool) becomes a `Tool` whose `parameters` is the component's prop schema. `Tool.metadata` is the protocol's sanctioned slot for renderer and routing hints, such as a component id, a Code Connect or Figma node mapping, or a catalog version. The client then validates `toolCallArgs` against its own copy of the schema at `TOOL_CALL_END` and renders. This is the "Components as Tools" pattern CopilotKit ships (Section 5).
- Because `parameters` is opaque and provider schema support is uneven (`$ref`/`oneOf` issues), a rich design-system prop schema, with discriminated unions, token enums and slot structures, may need flattening per model. Catalog versioning therefore needs an application convention, for example in `Tool.metadata` or the tool name.
- A render-only component tool is a "terminal effect" in the spec's sense. The run finishes as success with the call pending. The application must still send a tool message (even "rendered") before continuing the thread, or many models will reject the history.

### Gaps
- The spec has no tool-schema versioning, deprecation or negotiation mechanism.
- There is no standard way to mark a tool as "render-only" versus "needs result", beyond the application's own rules.

---

## 4. State: shared state, snapshots vs deltas, frontend write-back, predictive state updates

### Takeaway
State is any JSON value kept in sync by `STATE_SNAPSHOT` (replace wholesale) and `STATE_DELTA` (RFC 6902 patch against the consumer's current value). The frontend writes state back only by sending it as `RunAgentInput.state` on the next run. There is no client→agent delta event. "Predictive state updates" are not part of the 1.0 spec. They are a CopilotKit/LangGraph convention carried as a `CUSTOM` event named `"PredictState"`.

### Cited Findings
- `STATE_SNAPSHOT`: "A consumer MUST replace its state with `snapshot` — no merging." `STATE_DELTA`'s baseline: "at the start of a run, the input's `state`; after that, whatever the run's own snapshots and deltas have made of it." — [State 1.0](https://docs.ag-ui.com/spec/1.0/events/state)
- Cross-run behavior: "State persists across runs on a thread until an event replaces it, and the next run's input carries it back as the starting value — the loop that keeps both sides agreed." A producer emitting deltas "MUST compute them against this value until its own first snapshot replaces it." — [State 1.0](https://docs.ag-ui.com/spec/1.0/events/state); [Run Input](https://docs.ag-ui.com/spec/1.0/basic/run-input)
- `State` is "deliberately unconstrained — any JSON value, not only an object". — [State 1.0](https://docs.ag-ui.com/spec/1.0/events/state)
- Security: "State events are remote writes into application state. An application MUST validate what it reads out of state before acting on it … A producer, in turn, SHOULD NOT put secrets in state". — [State 1.0](https://docs.ag-ui.com/spec/1.0/events/state)
- `MESSAGES_SNAPSHOT` reconciliation: in-place replace by id, append unseen ones, drop consumer-held messages absent from the snapshot, except activity and reasoning messages (per-role and "self-revoking"). — [State 1.0](https://docs.ag-ui.com/spec/1.0/events/state)
- Frontend write-back in the SDK:
  - `AbstractAgent.setState(state)`, `setMessages()`, `addMessage()`. — [client/src/agent/agent.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/agent.ts)
  - Subscribers can return `AgentStateMutation { messages?, state?, stopPropagation? }` to replace state or messages during event handling. — [AgentSubscriber](https://docs.ag-ui.com/sdk/js/client/subscriber)
  - The concept page says "Both sides can modify the state" and shows CopilotKit's `useCoAgent({ name, initialState })` returning `{ state, setState }`. — [State concept](https://docs.ag-ui.com/concepts/state)
- Guidance on state schemas is informal only (concept page best practices): "Structure state thoughtfully: Design state objects to support partial updates and minimize patch complexity", "Handle state conflicts", "Avoid storing sensitive information in shared state." The spec defines no state schema declaration mechanism, and `StateCapabilities` has only booleans (`snapshots`, `deltas`, `memory`, `persistentState`). — [State concept](https://docs.ag-ui.com/concepts/state); [schema.json](https://ag-ui.com/spec/1.0/schema.json)
- Predictive state updates:
  - The LangGraph integration's `StateStreamingMiddleware(StateItem(state_key, tool, tool_argument))` sets `predict_state` metadata. — [state_streaming.py](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/langgraph/python/ag_ui_langgraph/middlewares/state_streaming.py)
  - The agent then emits `CustomEvent(type=EventType.CUSTOM, name="PredictState", value=predict_state_metadata)`. — [ag_ui_langgraph/agent.py](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/langgraph/python/ag_ui_langgraph/agent.py)
  - The TS client's legacy bridge (`convertToLegacyEvents`) interprets `PredictStateValue { state_key, tool, tool_argument }`. While a matching tool call's arguments stream, it writes `currentArgs[tool_argument]` (untruncated partial JSON) into `state[state_key]`, so the UI updates before the tool finishes. — [client/src/legacy/convert.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/legacy/convert.ts)
  - A grep of all 86 docs.ag-ui.com pages found no "predictive state" section.

### Inferences
- For a Figma<>code loop, shared state is a plausible carrier for the "document under construction", such as a component tree or a token set, with JSON Patch deltas giving fine-grained streaming edits. Two limits apply. Designer edits made mid-run cannot reach the agent until the next run. The protocol has no conflict resolution or merge semantics, only last snapshot wins, and applications must handle concurrent edits themselves.
- Predictive state is a de facto pattern tied to the LangGraph integration and CopilotKit's legacy bridge, not an interoperable 1.0 feature. A design-system client should not depend on it across frameworks.

### Gaps
- It is unclear whether CopilotKit's current (v2) runtime still consumes `PredictState` outside the legacy converter. I did not read CopilotKit's current shared-state docs in full.

---

## 5. Generative UI: AG-UI's own position, and its relationship with A2UI, MCP-UI/MCP Apps, Open-JSON-UI and CopilotKit

### Takeaway
The AG-UI docs say plainly that "**AG-UI is not a generative UI specification**". It is the runtime transport and interaction layer, and it "natively supports" A2UI, MCP-UI/MCP Apps and Open-JSON-UI. Concretely, first-party AG-UI middlewares in the AG-UI repo carry A2UI surfaces and MCP Apps *inside* standard AG-UI events. A2UI operations ride `ACTIVITY_SNAPSHOT` with `activityType: "a2ui-surface"`, and MCP Apps ride `ACTIVITY_SNAPSHOT` with `activityType: "mcp-apps"`. Catalogs and actions travel via `context`, `tools` and `forwardedProps`. AG-UI's own generative-UI proposal (a `generateUserInterface` tool) is still a draft. CopilotKit frames the spectrum as Controlled/Static, Declarative and Open-Ended.

### Cited Findings

**AG-UI's own statements**
- "A2UI, MCP-UI, and Open-JSON-UI are all **generative UI specifications** … Despite the naming similarities, **AG-UI is not a generative UI specification** — it's a **User Interaction protocol** that provides the **bi-directional runtime connection** between the agent and the application. AG-UI natively supports all of the above generative UI specs and allows developers to define **their own custom generative UI standards** as well." The table attributes A2UI to "Google", Open-JSON-UI to "OpenAI" ("An open standardization of OpenAI's internal declarative Generative UI schema"), and MCP-UI to "Microsoft + Shopify" ("A fully open, iframe-based Generative UI standard extending MCP"). — [Generative UI (concepts)](https://docs.ag-ui.com/concepts/generative-ui-specs)
- The introduction lists A2UI as "Supported" and MCP Apps as "Supported", and says "A2UI is a generative UI specification - allowing agents to deliver UI widgets, where AG-UI is the Agent↔User Interaction protocol". — [AG-UI Overview](https://docs.ag-ui.com/introduction)
- AG-UI contributors "have recently added handshakes, allowing AG-UI to 'front for' agents through MCP and A2A protocols". AG-UI calls itself the "'kitchen sink' protocol". — [MCP, A2A, and AG-UI](https://docs.ag-ui.com/agentic-protocols)
- Draft (not in 1.0), "Generative User Interfaces", Status: Draft, author Markus Ecker:
  - It proposes injecting a tool named `generateUserInterface` with arguments `description`, `data` and `output` (the schema of data expected back).
  - A secondary generator then produces the UI, for example JSON Schema + JSON Forms `uiSchema`, or React Hook Form code.
  - Rationale: "creating custom user interfaces for agent interactions requires programmers to define specific tool renderers."
  — [Generative UI draft](https://docs.ag-ui.com/drafts/generative-ui)
- The drafts overview lists Reasoning, Interrupt-Aware Run Lifecycle, Generative User Interfaces and Meta Events as "Current Drafts". Reasoning and interrupts have since been normatively specified in 1.0, so the overview page lags the spec. — [Drafts overview](https://docs.ag-ui.com/drafts/overview); [Key Changes](https://docs.ag-ui.com/spec/1.0/changelog)

**A2UI carried over AG-UI (implementation details)**
- A2UI's own spec lists AG-UI as a transport. From A2UI v0.9 ("Status: Stable, Created: Nov 20, 2025"), AG-UI is "Also an excellent transport option for A2UI", alongside A2A, MCP, SSE+JSON-RPC, WebSockets and REST.
  - Server→client messages: `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`.
  - Client→server messages: `action`, `error`.
  - Each surface references a `catalogId`. A Basic Catalog exists, and custom catalogs can replace it.
  — [A2UI v0.9 specification](https://a2ui.org/specification/v0.9-a2ui/)
- `@ag-ui/a2ui-middleware` (npm 0.0.11, published 2026-09-30, pre-1.0):
  - `A2UIActivityType = "a2ui-surface"`. The middleware emits `ACTIVITY_SNAPSHOT` events with `messageId: "a2ui-surface-${toolCallId}"` and `content: { a2ui_operations: [...] }` (`A2UI_OPERATIONS_KEY = "a2ui_operations"`), plus pre-paint lifecycle content `status: "building" | "retrying" | "failed"`.
  - It optionally injects a tool named `"render_a2ui"` (`injectA2UITool`) and recognizes `a2uiToolNames` while streaming their args to extract components progressively.
  - It injects the component catalog into `RunAgentInput.context` under the fixed description `A2UI_SCHEMA_CONTEXT_DESCRIPTION` ("A2UI Component Schema — available components for generating UI surfaces…"), with `value: JSON.stringify({ catalogId, components })`.
  - It validates with `validateA2UIComponents` from `@ag-ui/a2ui-toolkit`, with retry up to `MAX_A2UI_ATTEMPTS` (= 3).
  - It reads user interactions from `forwardedProps.a2uiAction.userAction` (`{name, surfaceId, sourceComponentId, …}`).
  — [a2ui-middleware/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/src/index.ts); [types.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/src/types.ts); [a2ui-toolkit src/recovery.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/a2ui-toolkit/src/recovery.ts); [npm @ag-ui/a2ui-middleware](https://registry.npmjs.org/@ag-ui/a2ui-middleware)
- Catalog governance in the middleware: "catalog choice belongs to the host/factory, not the subagent (the subagent must not be able to invent a catalog the frontend hasn't registered)". `defaultCatalogId` config applies, and otherwise the middleware falls back to the frontend-registered catalog id from context, then to the "v0.9 basic catalog". The catalog config type is `A2UIInlineCatalogSchema { catalogId: string; components: Record<string, JSON Schema> }`. — [types.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/src/types.ts)
- `@ag-ui/a2ui-toolkit` 0.0.4 offers "Framework-agnostic helpers for building A2UI subagent tools", with op builders `createSurface`, `updateComponents`, `updateDataModel`, `buildSubagentPrompt`, `prepareA2UIRequest`, `buildA2UIEnvelope`, and a Python counterpart. — [a2ui-toolkit README](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/a2ui-toolkit/README.md)
- CopilotKit wiring:
  - `new CopilotRuntime({ agents, a2ui: {} })` "automatically applies `A2UIMiddleware` to all registered agents". — [CopilotKit A2UI](https://docs.copilotkit.ai/generative-ui/a2ui)
  - The frontend catalog uses `@copilotkit/a2ui-renderer` with Zod prop schemas. Bindable props must be declared "as a union of the literal type and the binding object" (`{ "path": "/origin" }` JSON Pointer into the data model), merged with a basic catalog via `includeBasicCatalog: true`.
  - Two flavors: Fixed Schema (the schema is authored, "e.g. using the A2UI Composer", and the agent supplies data) and Dynamic Schema (the LLM generates the schema).
  — [CopilotKit A2UI Fixed Schema](https://docs.copilotkit.ai/generative-ui/a2ui/fixed-schema)

**MCP Apps (SEP-1865) carried over AG-UI**
- SEP-1865 "MCP Apps - Interactive User Interfaces for MCP":
  - Status "Final", Extensions Track, created 2025-11-21.
  - It declares UI resources with the `ui://` scheme, associated with tools via metadata, using HTML `text/html;profile=mcp-app`, "Mandatory iframe sandboxing", and UI↔host communication over MCP JSON-RPC.
  - It says "MCP-UI … developed the bi-directional communication model" and that "OpenAI's Apps SDK … further validated the demand".
  — [SEP-1865](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
- `@ag-ui/mcp-apps-middleware` (0.1.1, 2026-09-11):
  - It "Discovers UI-enabled tools from MCP servers", "Injects tools into the agent's tool list", and "Executes tool calls and emits activity snapshots with resource URIs".
  - The event shape is `{ type: "ACTIVITY_SNAPSHOT", activityType: "mcp-apps", content: { result, resourceUri, serverHash, serverId?, toolInput }, replace: true }`.
  - The frontend fetches the resource via a proxied MCP request in `forwardedProps.__proxiedMCPRequest`, limited to `tools/call`, `resources/read`, `notifications/message` and `ping`.
  — [mcp-apps-middleware README](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/mcp-apps-middleware/README.md)
- The source reads `tool._meta.ui.resourceUri` (with a legacy `_meta["ui/resourceUri"]` fallback) and advertises MIME `text/html;profile=mcp-app`. A source comment reads "TODO: Once AG-UI Tool type supports _meta, use that instead". — [mcp-apps-middleware/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/mcp-apps-middleware/src/index.ts)
- CopilotKit: MCP Apps is "Zero frontend code — UI components are served by the MCP server … Content runs in isolated iframes". It is wired via `new BuiltInAgent({...}).use(new MCPAppsMiddleware({ mcpServers: [...] }))`. — [CopilotKit MCP Apps](https://docs.copilotkit.ai/generative-ui/mcp-apps)

**CopilotKit's framing (static / declarative / open-ended)**
- CopilotKit ships "Six primitives":
  - Components as Tools (`useComponent`)
  - Tool Call Rendering (`useRenderTool`)
  - State Rendering
  - Reasoning
  - A2UI
  - MCP Apps

  The spectrum is "**Controlled** — you wrote the component; the agent only picks *which* one … **Declarative** — the agent emits a structured spec; the frontend composes from a catalog you registered. Creativity inside a guardrail. *A2UI* … **Open-Ended** — the UI is invented elsewhere (an MCP server) and you sandbox it … hardest to guarantee accessibility / brand / security. *MCP Apps*." — [CopilotKit Generative UI overview](https://docs.copilotkit.ai/concepts/generative-ui-overview)
- Components as Tools: "you register a React component with `useComponent`, and CopilotKit exposes it to the agent as a tool … passing the tool's arguments straight through as typed props … no handler, no user interaction, no server-side execution." — [CopilotKit Components as Tools](https://docs.copilotkit.ai/generative-ui/tool-based)
- Open-JSON-UI does not appear among CopilotKit's current six primitives. It appears only in the AG-UI concept page table. — [CopilotKit Generative UI overview](https://docs.copilotkit.ai/concepts/generative-ui-overview); [AG-UI Generative UI](https://docs.ag-ui.com/concepts/generative-ui-specs)
- Discrepancy on MCP-UI provenance. AG-UI docs attribute it to "Microsoft + Shopify". SEP-1865 credits MCP-UI as a community project (repo `idosal/mcp-ui`, with SEP authors including Ido Salomon and Liad Yosef) whose adopters include "Postman, HuggingFace, Shopify, Goose, and ElevenLabs". — [AG-UI Generative UI](https://docs.ag-ui.com/concepts/generative-ui-specs); [SEP-1865](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)

### Inferences
- For design-system-constrained generation, the "Declarative" lane (A2UI over AG-UI) is the one that matches the brief. The design system becomes an A2UI catalog (`catalogId` + component JSON Schemas). The agent can only emit components from it, the frontend renders with real design-system components, and the middleware validates and retries. The "Controlled" lane (one frontend tool per component) is the simpler alternative. MCP Apps (open-ended iframes) works against brand and accessibility constraints, a tradeoff CopilotKit's own docs acknowledge.
- A2UI-over-AG-UI is today a *convention implemented by middleware*, not part of the AG-UI 1.0 spec. Its key names (`a2ui-surface`, `a2ui_operations`, the context description string, `forwardedProps.a2uiAction`) are defined in a 0.0.x package, which may change without the stability promises of 1.0.
- The fixed description-string lookup for the catalog in `context` is fragile: matching on prose rather than a typed field. It shows the gap that the core spec has no typed "catalog" slot.

### Gaps
- I did not independently verify Open-JSON-UI's existence, status or OpenAI provenance. Only the AG-UI docs assert it.
- I did not read the A2UI v0.9 spec's catalog JSON Schema itself, or the `ext-apps` full MCP Apps specification text.

---

## 6. SDKs: @ag-ui/core, @ag-ui/client, @ag-ui/encoder, exact exports and minimal examples

### Takeaway
The npm latest for all three is 1.0.1 (2026-09-29). `@ag-ui/core` is types and constants only, with Zod validators on the `@ag-ui/core/schemas` subpath. `@ag-ui/client` provides `AbstractAgent`, `HttpAgent`, the subscriber system, the middleware classes, and the pipeline operators (`verifyEvents`, `enforceEvents`, `transformChunks`, `defaultApplyEvents`), and re-exports core. `@ag-ui/encoder` provides `EventEncoder` with `encode()`/`getContentType()`. Note that there is no export named `applyEvents`. The apply stage is `defaultApplyEvents`.

### Cited Findings
- Versions and dependencies:
  - `@ag-ui/core` 1.0.1 has peer dependency `zod ^3.25.18 || ^4.0.0` and exports `"."` and `"./schemas"`.
  - `@ag-ui/client` 1.0.1 depends on `@ag-ui/core`, `@ag-ui/encoder`, `@ag-ui/proto`, `rxjs 7.8.1`, `fast-json-patch ^3.1.1`, `untruncate-json`, `zod`, `uuid` and `compare-versions`.
  - `@ag-ui/encoder` 1.0.1 depends on core and proto.
  — [core/package.json](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/core/package.json); [npm @ag-ui/client](https://registry.npmjs.org/@ag-ui/client)
- Weekly downloads (2026-09-22 → 2026-09-28): `@ag-ui/core` 2,535,905; `@ag-ui/client` 1,614,694. — [npm downloads core](https://api.npmjs.org/downloads/point/last-week/@ag-ui/core); [npm downloads client](https://api.npmjs.org/downloads/point/last-week/@ag-ui/client)
- Core: `import { EventType } from "@ag-ui/core"` and `import { EventSchemas, UserMessageSchema } from "@ag-ui/core/schemas"`. `RunAgentInputSchema` is also imported from `@ag-ui/core/schemas` in official examples. — [Migrating to 1.0](https://docs.ag-ui.com/migrating-to-1-0); [claude-agent-sdk example server](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/claude-agent-sdk/typescript/examples/server.ts)
- `@ag-ui/client` exports (from `src/index.ts` and module files):
  - Agents: `AbstractAgent`, `HttpAgent`, `RunAgentResult`, `RunAgentParameters`, `AgentSubscriber`.
  - Pipeline operators: `defaultApplyEvents`, `verifyEvents`, `enforceEvents`, `enforceOutgoingInput`, `isRecognizedEvent`, `transformChunks`.
  - Transport helpers: `transformHttpEventStream`, `parseSSEStream`, `parseProtoStream`, `runHttpRequest`.
  - Utilities: `compactEvents`, `convertToLegacyEvents`.
  - Middleware: `Middleware`, `FunctionMiddleware`, `MiddlewareFunction`, `FilterToolCallsMiddleware`, `CompatibilityBoundary`, `BackwardCompatibility_0_0_39`, `BackwardCompatibility_0_0_45`, `BackwardCompatibility_0_0_57`.
  - Interrupt helpers: `getRunOutcome`, `isInterruptExpired`, `buildResumeArray`.
  - Plus `export * from "@ag-ui/core"`.
  — [client/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/index.ts)
- `AbstractAgent` (source), public API:
  - Properties: `agentId`, `description`, `threadId`, `messages`, `state`, `subscribers`, `isRunning`, `pendingInterrupts`, `maxProtocolVersion`.
  - Methods: `subscribe(subscriber)` → `{ unsubscribe }`, `use(...middlewares)`, `runAgent(parameters?, subscriber?)` → `Promise<RunAgentResult {result, newMessages}>`, `connectAgent(...)`, `abortRun()`, `detachActiveRun()`, `clone()`, `addMessage()`, `addMessages()`, `setMessages()`, `setState()`, and optional `getCapabilities?()`.
  - Abstract `run(input: RunAgentInput): Observable<BaseEvent>`, with protected `connect()`, `apply()`, `prepareRunAgentInput()`, `onInitialize()`, `onError()`, `onFinalize()`.
  — [client/src/agent/agent.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/agent.ts)
  - The docs page shows `protected abstract run(input): RunAgent`, which differs slightly from the source signature. — [AbstractAgent docs](https://docs.ag-ui.com/sdk/js/client/abstract-agent)
- `HttpAgent({ url, headers? })`. Its default `requestInit` is `{ method: "POST", headers: { ...headers, "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(input), signal }`. — [HttpAgent](https://docs.ag-ui.com/sdk/js/client/http-agent)
- `AgentSubscriber` callbacks (full list from source):
  - Lifecycle: `onRunInitialized`, `onRunFailed`, `onRunFinalized`.
  - Generic: `onEvent`.
  - Run and step events: `onRunStartedEvent`, `onRunFinishedEvent`, `onRunErrorEvent`, `onStepStartedEvent`, `onStepFinishedEvent`.
  - Text events: `onTextMessageStartEvent`, `onTextMessageContentEvent`, `onTextMessageEndEvent`.
  - Tool events: `onToolCallStartEvent`, `onToolCallArgsEvent`, `onToolCallEndEvent`, `onToolCallResultEvent`.
  - State and message events: `onStateSnapshotEvent`, `onStateDeltaEvent`, `onMessagesSnapshotEvent`, `onActivitySnapshotEvent`, `onActivityDeltaEvent`.
  - Reasoning events: `onReasoningStartEvent`, `onReasoningMessageStartEvent`, `onReasoningMessageContentEvent`, `onReasoningMessageEndEvent`, `onReasoningEndEvent`, `onReasoningEncryptedValueEvent`.
  - Subagent events: `onSubagentStartedEvent`, `onSubagentFinishedEvent`, `onSubagentErrorEvent`.
  - Passthrough: `onRawEvent`, `onCustomEvent`.
  - Change notifications: `onMessagesChanged`, `onStateChanged`, `onNewMessage`, `onNewToolCall`.
  — [client/src/agent/subscriber.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/src/agent/subscriber.ts)
- Subscriber semantics: handlers may be async and "the agent will await their completion". They can return `AgentStateMutation { messages?, state?, stopPropagation? }`. `onTextMessageContentEvent` receives `textMessageBuffer`. `onToolCallArgsEvent` receives `toolCallBuffer`, `toolCallName` and `partialToolCallArgs`. `onToolCallEndEvent` receives `toolCallName` and `toolCallArgs`. — [AgentSubscriber](https://docs.ag-ui.com/sdk/js/client/subscriber)
- `EventEncoder` (source):
  - `new EventEncoder({ accept?: string })`.
  - `getContentType()` returns `"application/vnd.ag-ui.event+proto"` if the Accept header admits it, else `"text/event-stream"`.
  - `encode(event)` = `encodeSSE(event)`, which produces `` `data: ${JSON.stringify(omitOptionalNulls(event,"Event"))}\n\n` ``.
  - `encodeBinary(event)` returns protobuf if accepted, else SSE bytes.
  - `encodeProtobuf(event)` produces a 4-byte big-endian length prefix plus the message.
  - `AGUI_MEDIA_TYPE` is re-exported from `@ag-ui/proto`.
  — [encoder/src/encoder.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/encoder/src/encoder.ts); [proto/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/proto/src/index.ts)
  - The docs page for `@ag-ui/encoder` on docs.ag-ui.com is empty. — [@ag-ui/encoder docs](https://docs.ag-ui.com/sdk/js/encoder)
  - Caveat: `encode()` always emits SSE text even when protobuf was negotiated. A server that negotiates protobuf must call `encodeBinary()` and use `getContentType()`. This follows from [encoder.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/encoder/src/encoder.ts).
- Client changelog 1.0.0 (2026-09-17), quoted: "Adds the 1.0 enforcement pipeline that runs after middleware"; "Adds protobuf wire support"; "Snapshot metadata now lets a producer declare only its authoritative activity types, so projectors like A2UI middleware don't delete activity other producers own"; "Framing buffers are now capped". 1.0.1 (2026-09-29) fixed `connectAgent()` with pending interrupts. — [client CHANGELOG](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/typescript/packages/client/CHANGELOG.md)

**Minimal server over SSE (TypeScript, Node http).** Adapted from the official example [integrations/claude-agent-sdk/typescript/examples/server.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/claude-agent-sdk/typescript/examples/server.ts). The event sequence follows [quickstart/middleware](https://docs.ag-ui.com/quickstart/middleware) and the SSE example in [HTTP + SSE](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse).
```ts
import http from "node:http";
import { EventEncoder } from "@ag-ui/encoder";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { RunAgentInputSchema } from "@ag-ui/core/schemas";

http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const parsed = RunAgentInputSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
  if (!parsed.success) { res.writeHead(400); res.end(); return; }   // reject before RUN_STARTED
  const input: RunAgentInput = parsed.data;
  const encoder = new EventEncoder({ accept: req.headers.accept ?? "text/event-stream" });
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const send = (e: any) => res.write(encoder.encode(e));   // encode() = SSE text
  send({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });
  send({ type: EventType.TEXT_MESSAGE_START, messageId: "msg-1", role: "assistant" });
  send({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg-1", delta: "Hello world!" });
  send({ type: EventType.TEXT_MESSAGE_END, messageId: "msg-1" });
  send({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId });
  res.end();
}).listen(8000);
```
(The official example sets `"Content-Type": encoder.getContentType()` but then writes with `encode()`, which is SSE-only. The snippet above pins SSE to avoid that mismatch.)

**Minimal server (Python, official quickstart).** From [quickstart/server](https://docs.ag-ui.com/quickstart/server):
```python
@app.post("/")
async def agentic_chat_endpoint(input_data: RunAgentInput, request: Request):
    accept_header = request.headers.get("accept")
    encoder = EventEncoder(accept=accept_header)
    async def event_generator():
        yield encoder.encode(RunStartedEvent(type=EventType.RUN_STARTED,
                                             thread_id=input_data.thread_id, run_id=input_data.run_id))
        # ... TEXT_MESSAGE_CHUNK / TOOL_CALL_CHUNK ... RUN_FINISHED
    return StreamingResponse(event_generator(), media_type=encoder.get_content_type())
```

**Minimal in-process agent (TypeScript, official quickstart).** From [quickstart/middleware](https://docs.ag-ui.com/quickstart/middleware):
```ts
import { AbstractAgent, BaseEvent, EventType, RunAgentInput } from "@ag-ui/client"
import { Observable } from "rxjs"
export class OpenAIAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    const messageId = Date.now().toString()
    return new Observable<BaseEvent>((observer) => {
      observer.next({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId } as any)
      observer.next({ type: EventType.TEXT_MESSAGE_START, messageId } as any)
      observer.next({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: "Hello world!" } as any)
      observer.next({ type: EventType.TEXT_MESSAGE_END, messageId } as any)
      observer.next({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId } as any)
      observer.complete()
    })
  }
}
```

**Minimal client subscriber (TypeScript).** Adapted from [quickstart/clients](https://docs.ag-ui.com/quickstart/clients) and [AgentSubscriber](https://docs.ag-ui.com/sdk/js/client/subscriber):
```ts
import { HttpAgent, type AgentSubscriber } from "@ag-ui/client"
const agent = new HttpAgent({ url: "https://api.example.com/agent" })
agent.messages.push({ id: crypto.randomUUID(), role: "user", content: "Build a pricing card" })
const sub: AgentSubscriber = {
  onTextMessageContentEvent: ({ event }) => process.stdout.write(event.delta),
  onToolCallEndEvent: ({ toolCallName, toolCallArgs }) => console.log("render", toolCallName, toolCallArgs),
  onStateSnapshotEvent: ({ event }) => console.log("state", event.snapshot),
  onRunFinalized: () => console.log("done"),
}
const { unsubscribe } = agent.subscribe(sub)              // persistent
await agent.runAgent({ tools: [/* frontend tools */] })     // or runAgent(params, sub) for one run
```

- Other first-party and community SDKs: Python (`ag_ui.core`, `ag_ui.encoder`) and .NET (`AGUI.Abstractions`, `AGUIChatClient`, hosting endpoints) are first-party. Community SDKs listed are Kotlin, Go, Dart, Java, Rust, Ruby and C++. — [llms.txt index](https://docs.ag-ui.com/llms.txt); [AG-UI Overview](https://docs.ag-ui.com/introduction); repo `sdks/community/` (c++, dart, go, java, kotlin, ruby, rust)

### Inferences
- An engineer building a design-system renderer should consume events through `AbstractAgent`/`HttpAgent` plus subscribers or `events$`. That inherits enforcement, chunk expansion and verification. A custom SSE parser would have to reimplement the processing model to be conformant.
- `Middleware` (via `agent.use(...)`) is the extension seam for a design-system layer. Examples: injecting catalog tools and context on the way out, validating tool args against the catalog, or converting tool calls into `ACTIVITY_SNAPSHOT` surfaces, as the A2UI and MCP Apps middlewares already do.

### Gaps
- I did not read the Python and .NET SDK pages in detail.
- I did not verify every export of `@ag-ui/core`'s main entry, such as factory function names in `event-factories.ts`.

---

## 7. Ecosystem, adoption and governance (as of September 2026), and design-system/Figma/Storybook use

### Takeaway
AG-UI integrations exist for most major agent frameworks: LangGraph/LangChain, CrewAI, Microsoft Agent Framework, Google ADK, AWS Strands, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2, the Claude Agent SDK, Oracle Agent Spec and others. CopilotKit is the primary client. The protocol is stewarded by CopilotKit, a venture-backed company that raised a $27M Series A in May 2026. I found no evidence of a foundation. AG-UI is not among the Linux Foundation AAIF's listed projects. I found no Figma plugin or Storybook addon built on AG-UI, and no established design-system team using it. There are only two tiny community projects bridging AG-UI/A2UI to a design system (AWS Cloudscape; "dspack-studio").

### Cited Findings
- Integration tables on docs.ag-ui.com (status "Supported" unless noted):
  - Partnerships: LangChain/LangGraph, CrewAI.
  - First party: Microsoft Agent Framework, Google ADK, AWS Strands Agents, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2. AWS Bedrock Agents is "In Progress".
  - Community: Claude Agent SDK, Claude Managed Agents SDK, Langroid. OpenAI Agent SDK and Cloudflare Agents are "In Progress".
  - A2A Middleware.
  - Amazon Bedrock AgentCore listed as a 1st-party platform.
  - Oracle Agent Spec.
  - Generative UI specs: A2UI and MCP Apps.
  - Clients: CopilotKit (1st party), Terminal + Agent, chat platforms (Slack, Microsoft Teams via CopilotKit Channels SDK), React Native.
  — [AG-UI Overview](https://docs.ag-ui.com/introduction)
- Repo integration directories present on 2026-09-30: `a2a`, `adk-middleware`, `ag2`, `agent-spec`, `agno`, `aws-strands`, `claude-agent-sdk`, `claude-managed-agents`, `crew-ai`, `langchain`, `langgraph`, `langroid`, `llama-index`, `mastra`, `microsoft-agent-framework`, `pydantic-ai`, `server-starter`, `server-starter-all-features`, `vercel-ai-sdk`, `watsonx`. Under `integrations/community`: `cloudflare-agents`, `genkit`, `spring-ai`. Middlewares: `a2a-middleware`, `a2ui-middleware`, `event-throttle-middleware`, `mcp-apps-middleware`, `mcp-middleware`. — [ag-ui repo](https://github.com/ag-ui-protocol/ag-ui)
- Stewardship and commercial context:
  - The docs' "Production support" page: "CopilotKit offers optional commercial engineering support. This is separate from using or contributing to the AG-UI open-source project." — [Production support](https://docs.ag-ui.com/talk-to-us)
  - The repository license is MIT. — [ag-ui LICENSE](https://github.com/ag-ui-protocol/ag-ui/blob/main/LICENSE)
  - The roadmap is a GitHub project board. — [Roadmap](https://docs.ag-ui.com/development/roadmap)
  - I found no GOVERNANCE file or steering-committee mention in the README or CONTRIBUTING (grep of the repo; only "A maintainer will review" appears). — [CONTRIBUTING.md](https://github.com/ag-ui-protocol/ag-ui/blob/main/CONTRIBUTING.md)
- Funding and adoption claims (secondary source, May 6, 2026): "$27 million in Series A funding led by Glilot Capital Partners, NFX, and SignalFire"; AG-UI "has been adopted by major technology companies and agent frameworks, including Google, Microsoft, Amazon, Oracle, LangChain, LlamaIndex, and others"; "AG-UI libraries now generate more than 4 million weekly downloads"; "more than 40,000 GitHub stars and contributions from over 150 developers" (for the "open-source SDK ecosystem"). No foundation plans were mentioned. — [Pulse 2.0](https://pulse2.com/copilotkit-27-million-series-a-raised-for-enterprise-agentic-frontend-stack/)
- Foundation: the Linux Foundation's Agentic AI Foundation projects page lists Model Context Protocol, goose, AGENTS.md, agentgateway, Agent2Agent and Agent Router, not AG-UI. — [AAIF Projects](https://aaif.io/projects/)
- Design-system, Figma and Storybook usage:
  - GitHub code search for `"@ag-ui/client" figma` returned 18 hits. None was a Figma plugin: they are landscape documents, research notes, and vendored copies of the AG-UI repo's `mcp-apps-middleware`. — GitHub code search (API), 2026-09-30
  - `"@ag-ui/client" storybook` hits are CopilotKit's own Angular chat-component Storybook (`CopilotKit/CopilotKit/examples/v2/angular/storybook/…`), which documents CopilotKit's chat UI, not a design system using AG-UI to generate UI. Other hits are apps (langfuse, langflow, bytechef) that have both packages as dependencies. — GitHub code search (API)
- Two community projects combining AG-UI/A2UI with a design system (both tiny, about 1 star):
  - `golevishal/agui-cloudscape-renderer`: "A reactive rendering engine that bridges the A2UI Protocol with the native AWS Cloudscape Design System", with an SSE hook `useSSEAgUiEvents`. — [agui-cloudscape-renderer](https://github.com/golevishal/agui-cloudscape-renderer)
  - `aestheticfunction/dspack-studio`: "builds the interface from your design system's *approved components only*, checks every attempt against the system's own rules, repairs what it can". Generation runs "onto A2UI, streamed over AG-UI", with S1/S2/S3 validation gates and rule-level repair, such as `rule.destructive-requires-alertdialog`. — [dspack-studio](https://github.com/aestheticfunction/dspack-studio)
- No first-party AG-UI or CopilotKit Figma integration appears in the AG-UI integrations list or in the CopilotKit docs index (llms.txt) I read. — [AG-UI Overview](https://docs.ag-ui.com/introduction); [CopilotKit llms.txt](https://docs.copilotkit.ai/llms.txt)

### Inferences
- Framework coverage is broad enough that a design-system team would not be locked to one agent framework. The generative-UI conventions that matter (A2UI middleware, MCP Apps middleware) are, however, most complete in CopilotKit's runtime, which concentrates practical dependency on one vendor.
- The absence of Figma/Storybook integrations means a Figma<>code loop over AG-UI would be greenfield. A Figma plugin could act as an AG-UI *client* (an `HttpAgent` in the plugin UI iframe, executing frontend tools against the Figma plugin API), and a code-side renderer as another client on the same `threadId`. Nothing in the protocol prevents this, but nothing documents it either.

### Gaps
- Primary-source confirmation of the Series A (GeekWire returned 403, and the CopilotKit blog post is JS-rendered). The download and star figures come from a secondary outlet and describe CopilotKit's ecosystem broadly.
- I did not find the GitHub star count for `ag-ui-protocol/ag-ui` as of September 2026, and did not query the API for it.
- Private or enterprise design-system usage of AG-UI would not be visible to these searches. The absence finding only covers public GitHub and docs.

---

## 8. Limits and open problems relevant to design systems

### Takeaway
AG-UI 1.0 is a well-specified transport and interaction layer, but it deliberately leaves everything design-system-specific to applications or middleware. It has no component-catalog concept, no typed UI payload, no tool-schema versioning, no capability retrieval, no mid-run client→agent channel, no standard WebSocket binding, and no conflict resolution for shared state. Its security model is a set of MUST/SHOULD obligations on the application (validate, consent, don't render as markup), not wire-level enforcement.

### Cited Findings
- The spec does not specify rendering: "It does not specify what any particular integration does with an event after receiving it, how an agent framework should be structured, or how a UI should render anything." — [Specification 1.0](https://docs.ag-ui.com/spec/1.0/index)
- There is no component catalog in the core schema. The 98 `$defs` in `schema.json` contain no catalog, component or surface definitions. UI surfaces appear only as open `ActivityMessage.content: object` with an open `activityType`, and the set is "the producer's, not the protocol's". — [schema.json](https://ag-ui.com/spec/1.0/schema.json); [Activity 1.0](https://docs.ag-ui.com/spec/1.0/events/activity)
- `Tool.parameters` is "Carried opaquely: the protocol does not constrain or validate it". Tool arguments are text the protocol "does not validate". — [schema.json](https://ag-ui.com/spec/1.0/schema.json); [Tool Calls 1.0](https://docs.ag-ui.com/spec/1.0/events/tool-calls)
- There is no standard structured output: "this version of the protocol has no field through which a consumer supplies [a schema] and no event that identifies output as structured." — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
- There is no capability retrieval: "No transport binding in this version carries a capabilities exchange". — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities)
- There is no mid-run input: "The protocol has no mid-run channel from the consumer". The interrupt pattern ends the run instead. — [Interrupts and Resume](https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume)
- There is no stream resumption on the standard bindings. `transport.resumable` and `pushNotifications` "describe mechanisms this version does not define". — [Capabilities 1.0](https://docs.ag-ui.com/spec/1.0/basic/capabilities); [HTTP + SSE](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse)
- Security model:
  - "The protocol itself cannot enforce these principles. Implementors SHOULD build consent flows for consequential actions, validate schema and semantics at every trust boundary, isolate rendering from execution, and log enough to audit what an agent did on a user's behalf." — [Specification 1.0](https://docs.ag-ui.com/spec/1.0/index)
  - "AG-UI defines no credential". — [Transports](https://docs.ag-ui.com/spec/1.0/basic/transports/index)
  - Passthrough content "MUST [be treated] as untrusted input — never rendered as markup, executed, or granted authority". — [Raw and Custom Events](https://docs.ag-ui.com/spec/1.0/events/passthrough)
- Unknown extension fields are stripped by the TS client. "If you were reading a non-standard property off an event in a subscriber, it is gone before the subscriber sees it. The sanctioned channel for extra data is `metadata`." — [Migrating to 1.0](https://docs.ag-ui.com/migrating-to-1-0)
- The generative-UI draft names practical limits: tool description length (OpenAI 1024 chars), uneven JSON Schema support (`$ref`, `oneOf`), and "Injecting a large UI description language into an agent may reduce its performance. Agents dedicated solely to UI generation perform better". — [Generative UI draft](https://docs.ag-ui.com/drafts/generative-ui)
- Open-ended UI tradeoff (CopilotKit): MCP Apps offers the "Highest expressive range, hardest to guarantee accessibility / brand / security". — [CopilotKit Generative UI overview](https://docs.copilotkit.ai/concepts/generative-ui-overview)
- MCP tool `_meta` is not carried on the AG-UI `Tool` type: "TODO: Once AG-UI Tool type supports _meta, use that instead". — [mcp-apps-middleware/src/index.ts](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/mcp-apps-middleware/src/index.ts)
- The declarative lane (A2UI middleware) is pre-1.0 (`@ag-ui/a2ui-middleware` 0.0.11). Its 0.0.11 changelog notes "Documented the parallel call limitation". — [a2ui-middleware CHANGELOG](https://github.com/ag-ui-protocol/ag-ui/blob/main/middlewares/a2ui-middleware/CHANGELOG.md)

### Inferences
- What a design-system renderer on AG-UI must implement itself:
  1. A catalog representation, either as frontend `tools` (one per component) or an A2UI catalog passed through `context`.
  2. Validation of every tool argument, state value and activity payload against the catalog, done client-side because the protocol will not.
  3. A policy for unadvertised tool names and unknown `activityType`s.
  4. The obligatory tool-message answer for every render call before continuing a thread.
  5. Versioning of catalogs and tool schemas, for example in `Tool.metadata` or `CUSTOM` names with vendor prefixes, or tool names.
  6. Consent UI for side-effectful tools, such as writing to Figma or opening a PR.
  7. A decision on whether to adopt the A2UI-over-`ACTIVITY_SNAPSHOT` convention (`a2ui-surface`) or define a vendor-prefixed `activityType` of its own.
- For a Figma<>code loop, AG-UI supplies the session plumbing: threads, streamed tool calls, shared state via JSON Patch, interrupts for approvals, and subagents for splitting "design" and "code" work. It does not supply a design model, token semantics, component identity across Figma and code, or conflict handling between a designer's and an agent's concurrent edits.

### Gaps
- There is no official AG-UI guidance on catalog or design-system patterns, beyond the draft `generateUserInterface` proposal and CopilotKit's product docs.
- There is no published threat model for AG-UI comparable to MCP Apps' "full threat model analysis".
