// The CSF source of a generated story, shared by the preset (which writes it
// during `storybook dev`) and the static-build fallback (which offers it for
// download), so both produce the same file.
//
// It is treeToCsf with two tags on the story's meta:
//   - `ai-generated`, the tag Storybook's own agentic setup puts on stories an
//     agent wrote, "for your review" (https://storybook.js.org/docs/ai/setup);
//     it lets a reviewer filter them in the sidebar.
//   - `!manifest`, which keeps the file out of the components manifest
//     (https://storybook.js.org/docs/ai/manifests). A generated screen is a
//     composition with no `meta.component`; left in, it shows up in
//     /manifests/components.json as an entry whose only content is the error
//     "No component found ... Specify meta.component." (observed with
//     storybook@10.6.1), which is what addon-mcp would then serve to agents.

import { harbor } from '../catalog/index.js';
import { treeToCsf } from '../tree/to-code.js';

export const GENERATED_TAGS = ['ai-generated', '!manifest'];

/**
 * @param {import('../tree/tree.js').UITree} tree
 * @param {{ title?: string, exportName?: string, importFrom?: string, prompt?: string }} options
 * @param {import('../catalog/index.js').Catalog} [catalog]
 */
export function generatedCsf(tree, options, catalog = harbor) {
  return treeToCsf(tree, catalog, { ...options, tags: GENERATED_TAGS });
}
