import { harbor } from '../../src/catalog/index.js';
import { Card, Grid, Stat } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

const METRICS = [
  ['Active users', '12,480', '+8.2%', 'up'],
  ['Conversion', '3.9%', '+0.4pt', 'up'],
  ['Churn', '1.2%', '-0.3pt', 'down'],
  ['Revenue', '$84.2k', '+12%', 'up'],
];

export default {
  title: 'Harbor/Layout/Grid',
  component: Grid,
  tags: ['harbor'],
  // `columns` is an integer from 1 to 4 in the catalog, so it gets a range control.
  argTypes: argTypesFromCatalog(harbor, 'Grid'),
  parameters: parametersFromCatalog(harbor, 'Grid'),
  render: (args) => (
    <Grid {...args}>
      {METRICS.map(([label, value, change, trend]) => (
        <Card key={label} padding="md">
          <Stat label={label} value={value} change={change} trend={trend} />
        </Card>
      ))}
    </Grid>
  ),
};

export const ThreeColumns = {};

export const FourColumns = { args: { columns: 4, gap: 'md' } };

export const TwoColumns = { args: { columns: 2 } };
