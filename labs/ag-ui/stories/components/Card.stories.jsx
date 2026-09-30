import { harbor } from '../../src/catalog/index.js';
import { Button, Card, Heading, Stack, Text } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Container/Card',
  component: Card,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Card'),
  parameters: parametersFromCatalog(harbor, 'Card'),
  render: (args) => (
    <div style={{ maxWidth: 420 }}>
      <Card {...args}>
        <Stack gap="sm">
          <Heading level={3} text="Team plan" />
          <Text tone="muted" text="Shared libraries, review and 10 seats." />
          <Button label="Choose Team" />
        </Stack>
      </Card>
    </div>
  ),
};

export const Flat = {};

export const Raised = { args: { elevation: 'raised' } };

export const Roomy = { args: { padding: 'xl', elevation: 'raised' } };
