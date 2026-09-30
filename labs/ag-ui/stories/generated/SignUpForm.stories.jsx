// Generated over AG-UI from harbor@1.0.0. Edit freely; the tree in
// parameters.agui is what the generator reads back.
import { Button, Card, Checkbox, Heading, Stack, Text, TextField } from '../../src/react/index.js';

export default {
  title: "Generated/Sign-up form",
  parameters: {
    layout: 'padded',
    agui: {
      catalog: "harbor@1.0.0",
      prompt: "a sign up form",
      tree: {"title":"Sign-up form","root":"n1","nodes":{"n1":{"type":"Card","props":{"padding":"xl","elevation":"raised"},"children":["n2"]},"n2":{"type":"Stack","props":{"gap":"lg"},"children":["n3","n4","n5","n6","n7","n8","n9","n10"]},"n3":{"type":"Heading","props":{"text":"Create your account","level":1}},"n4":{"type":"Text","props":{"text":"Start a 14-day trial. No card needed.","tone":"muted"}},"n5":{"type":"TextField","props":{"label":"Full name","placeholder":"Ada Lovelace","required":true}},"n6":{"type":"TextField","props":{"label":"Work email","type":"email","placeholder":"ada@example.com","required":true}},"n7":{"type":"TextField","props":{"label":"Password","type":"password","hint":"At least 12 characters.","required":true}},"n8":{"type":"Checkbox","props":{"label":"Email me product updates"}},"n9":{"type":"Button","props":{"label":"Create account","fullWidth":true}},"n10":{"type":"Button","props":{"label":"I already have an account","variant":"ghost","fullWidth":true}}}},
    },
  },
};

export const SignUpForm = {
  render: () => (
      <Card padding="xl" elevation="raised">
        <Stack gap="lg">
          <Heading text="Create your account" level={1} />
          <Text text="Start a 14-day trial. No card needed." tone="muted" />
          <TextField label="Full name" placeholder="Ada Lovelace" required />
          <TextField label="Work email" type="email" placeholder="ada@example.com" required />
          <TextField label="Password" type="password" hint="At least 12 characters." required />
          <Checkbox label="Email me product updates" />
          <Button label="Create account" fullWidth />
          <Button label="I already have an account" variant="ghost" fullWidth />
        </Stack>
      </Card>
  ),
};
