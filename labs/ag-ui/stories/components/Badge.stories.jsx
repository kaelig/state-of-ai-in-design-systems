import { harbor } from '../../src/catalog/index.js';
import { Badge, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Status/Badge',
  component: Badge,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Badge'),
  args: { label: 'Beta' },
  parameters: parametersFromCatalog(harbor, 'Badge'),
};

export const Neutral = {};

export const Success = { args: { tone: 'success', label: 'Active' } };

export const Danger = { args: { tone: 'danger', label: 'Overdue' } };

/** One badge per tone in the catalog enum. */
export const AllTones = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack direction="horizontal" gap="sm">
      {harbor.components.Badge.props.properties.tone.enum.map((tone) => (
        <Badge key={tone} tone={tone} label={tone} />
      ))}
    </Stack>
  ),
};
