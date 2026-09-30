import { harbor } from '../../src/catalog/index.js';
import { Heading, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Content/Heading',
  component: Heading,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Heading'),
  args: { text: 'Workspace settings' },
  parameters: parametersFromCatalog(harbor, 'Heading'),
};

export const Level2 = {};

export const Level1 = { args: { level: 1, text: 'Create your account' } };

export const Level3 = { args: { level: 3, text: 'Notifications' } };

/** The levels in order, as a page would use them: one level 1, no skipped levels. */
export const Hierarchy = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack gap="sm">
      <Heading level={1} text="Billing" />
      <Heading level={2} text="Plan" />
      <Heading level={3} text="Seats" />
    </Stack>
  ),
};
