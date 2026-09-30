// The CSF source of a generated story, shared by the preset (which writes it
// during `storybook dev`) and the static-build fallback (which offers it for
// download), so both produce the same file.
//
// On top of treeToCsf it adds two tags to the story's meta:
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
  const source = treeToCsf(tree, catalog, options);
  // treeToCsf takes no tags option yet, so the line goes in after the title,
  // the first property of the meta object it writes. If a later treeToCsf
  // writes tags itself, it is left alone.
  if (/^\s{2}tags:/m.test(source)) return source;
  const withTags = source.replace(/^(export default \{\n\s{2}title: .*,\n)/m, `$1  tags: ${JSON.stringify(GENERATED_TAGS).replace(/"/g, "'").replace(/,/g, ', ')},\n`);
  if (withTags === source) throw new Error('treeToCsf output changed shape: could not find the meta title line to tag.');
  return withTags;
}
