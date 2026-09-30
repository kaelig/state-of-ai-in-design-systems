import { harbor } from '../../src/catalog/index.js';
import { TextField } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Input/TextField',
  component: TextField,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'TextField'),
  args: { label: 'Work email', placeholder: 'you@company.com' },
  parameters: parametersFromCatalog(harbor, 'TextField'),
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
};

export const Default = {};

export const Email = { args: { type: 'email', required: true, hint: 'We only use it to sign you in.' } };

export const Password = { args: { label: 'Password', type: 'password', placeholder: undefined, hint: 'At least 12 characters.', required: true } };

export const Search = { args: { label: 'Search', type: 'search', placeholder: 'Find a project' } };
