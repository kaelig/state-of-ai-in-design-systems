import { harbor } from '../../src/catalog/index.js';
import { Checkbox } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Input/Checkbox',
  component: Checkbox,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Checkbox'),
  args: { label: 'Email me about product updates' },
  parameters: parametersFromCatalog(harbor, 'Checkbox'),
};

export const Unchecked = {};

export const Checked = { args: { checked: true, label: 'I agree to the terms' } };
