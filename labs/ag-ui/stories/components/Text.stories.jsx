import { harbor } from '../../src/catalog/index.js';
import { Text } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Content/Text',
  component: Text,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Text'),
  args: { text: 'Harbor keeps every value in a token, so a theme change reaches every component at once.' },
  parameters: parametersFromCatalog(harbor, 'Text'),
};

export const Default = {};

export const Muted = { args: { tone: 'muted', text: 'Last edited 2 minutes ago.' } };

export const Small = { args: { size: 'sm', tone: 'muted', text: 'Small print sits below the main copy.' } };
