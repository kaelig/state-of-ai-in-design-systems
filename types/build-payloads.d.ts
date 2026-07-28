// scripts/build.sh writes build/payload.json and build/md-map.json, and both
// netlify/functions/mcp.mjs and tests/mcp.test.mjs import them directly.
//
// With resolveJsonModule, TypeScript infers the full literal type of a 694KB
// generated file. That type is enormous, slow to check, and accidental — it
// describes today's data rather than the shape the data is required to have.
// It also produced a spurious assignability error on a plain .flatMap().
//
// These payloads get real types in the schema-generation step: types/data.d.ts
// is derived from schema/*.json, which is the contract the data must satisfy.
declare module '*.json' {
  const value: any;
  export default value;
}
