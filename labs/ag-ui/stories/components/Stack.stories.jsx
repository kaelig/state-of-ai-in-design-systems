import { harbor } from '../../src/catalog/index.js';
import { Badge, Button, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Layout/Stack',
  component: Stack,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Stack'),
  parameters: parametersFromCatalog(harbor, 'Stack'),
  render: (args) => (
    <Stack {...args}>
      <Badge label="One" tone="accent" />
      <Badge label="Two" />
      <Badge label="Three" tone="success" />
    </Stack>
  ),
};

export const Vertical = {};

export const Horizontal = { args: { direction: 'horizontal', gap: 'sm' } };

export const Toolbar = {
  args: { direction: 'horizontal', justify: 'space-between', align: 'center' },
  render: (args) => (
    <Stack {...args}>
      <Button label="Back" variant="ghost" />
      <Stack direction="horizontal" gap="sm">
        <Button label="Save draft" variant="secondary" />
        <Button label="Publish" />
      </Stack>
    </Stack>
  ),
};
