import { harbor } from '../../src/catalog/index.js';
import { Avatar, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Content/Avatar',
  component: Avatar,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Avatar'),
  args: { name: 'Ada Lovelace' },
  parameters: parametersFromCatalog(harbor, 'Avatar'),
};

export const Default = {};

export const Large = { args: { size: 'lg', name: 'Grace Hopper' } };

export const AllSizes = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack direction="horizontal" gap="md" align="center">
      {harbor.components.Avatar.props.properties.size.enum.map((size) => (
        <Avatar key={size} size={size} name="Margaret Hamilton" />
      ))}
    </Stack>
  ),
};
