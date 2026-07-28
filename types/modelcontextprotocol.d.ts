// @modelcontextprotocol/server@2.0.0-beta.5 ships no .d.ts files. Without this,
// checkJs infers registerTool's signature from the package's own untyped
// JavaScript and reports "no overload matches this call" at all nine
// registerTool sites in netlify/functions/mcp.mjs — the tests pass, the calls
// are correct, the inference is not.
//
// Loose on purpose. It replaces bad inference with no inference, which is the
// honest state of an untyped dependency. Delete it the day the package ships
// its own types; the nine call sites will then be checked for real.
declare module '@modelcontextprotocol/server' {
  export const createMcpHandler: any;
  export const isLegacyRequest: any;
  export const McpServer: any;
  export const preloadSchemas: any;
  export const ResourceTemplate: any;
  export const WebStandardStreamableHTTPServerTransport: any;
}
