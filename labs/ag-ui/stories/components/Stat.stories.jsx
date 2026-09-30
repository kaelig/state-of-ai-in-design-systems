import { harbor } from '../../src/catalog/index.js';
import { Grid, Stat } from '../../src/react/index.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../../src/storybook/arg-types.js';

export default {
  title: 'Harbor/Data/Stat',
  component: Stat,
  tags: ['harbor'],
  argTypes: argTypesFromCatalog(harbor, 'Stat'),
  args: { label: 'Active users', value: '12,480', change: '+8.2%', trend: 'up' },
  parameters: parametersFromCatalog(harbor, 'Stat'),
};

export const Up = {};

export const Down = { args: { label: 'Churn', value: '1.2%', change: '-0.3pt', trend: 'down' } };

export const WithoutChange = { args: { label: 'Tickets open', value: '37', change: undefined, trend: 'flat' } };

export const AllTrends = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Grid columns={3}>
      {harbor.components.Stat.props.properties.trend.enum.map((trend) => (
        <Stat key={trend} label={`Trend ${trend}`} value="42" change="3" trend={trend} />
      ))}
    </Grid>
  ),
};
