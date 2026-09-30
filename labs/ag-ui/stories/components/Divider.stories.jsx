import { harbor } from '../../src/catalog/index.js';
import { Divider, Stack, Text } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

// Divider takes no props in the catalog, so there are no controls to offer.
export default {
  title: 'Harbor/Layout/Divider',
  component: Divider,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Divider'),
  parameters: parametersFromCatalog(harbor, 'Divider'),
};

export const BetweenGroups = {
  render: () => (
    <Stack gap="md">
      <Text text="Account details" />
      <Divider />
      <Text text="Danger zone" tone="muted" />
    </Stack>
  ),
};
