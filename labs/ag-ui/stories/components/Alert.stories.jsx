import { harbor } from '../../src/catalog/index.js';
import { Alert, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Status/Alert',
  component: Alert,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Alert'),
  args: { title: 'Heads up', text: 'Your trial ends in 3 days. Add a payment method to keep your workspace.' },
  parameters: parametersFromCatalog(harbor, 'Alert'),
};

export const Info = {};

export const Success = { args: { tone: 'success', title: 'Saved', text: 'Your changes are live.' } };

export const Warning = { args: { tone: 'warning', title: 'Almost full', text: 'You have used 92% of your storage.' } };

export const Danger = { args: { tone: 'danger', title: 'Payment failed', text: 'We could not charge the card ending in 4242.' } };

export const WithoutTitle = { args: { title: undefined, text: 'A message with no title still reads as one block.' } };

export const AllTones = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack gap="sm">
      {harbor.components.Alert.props.properties.tone.enum.map((tone) => (
        <Alert key={tone} tone={tone} title={tone} text={`An alert with tone "${tone}".`} />
      ))}
    </Stack>
  ),
};
