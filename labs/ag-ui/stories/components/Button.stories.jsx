// Controls come from harbor.catalog.json through argTypesFromCatalog, so the
// panel offers exactly the variants and sizes the agent is allowed to emit.
//
// Args, by contrast, are plain literals holding only content. Storybook's
// components manifest (the one addon-mcp serves to coding agents) writes each
// story's usage snippet by reading args statically; a computed args object
// makes every snippet "incomplete". A prop left unset renders with its catalog
// default, which the Controls table shows under "default".
import { harbor } from '../../src/catalog/index.js';
import { Button, Stack } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Action/Button',
  component: Button,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Button'),
  args: { label: 'Save changes' },
  parameters: parametersFromCatalog(harbor, 'Button'),
};

export const Primary = {};

export const Secondary = { args: { variant: 'secondary', label: 'Cancel' } };

export const Ghost = { args: { variant: 'ghost', label: 'Skip for now' } };

export const Small = { args: { size: 'sm' } };

export const FullWidth = { args: { fullWidth: true, label: 'Create account' } };

export const Disabled = { args: { disabled: true } };

/** Every variant the catalog allows, read from the enum rather than listed by hand. */
export const AllVariants = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack direction="horizontal" gap="sm" align="center">
      {harbor.components.Button.props.properties.variant.enum.map((variant) => (
        <Button key={variant} variant={variant} label={variant} />
      ))}
    </Stack>
  ),
};
