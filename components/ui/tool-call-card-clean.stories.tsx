import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ToolCallCard, ToolCallGroup } from './tool-call-card-clean';

const meta = {
  title: 'UI/ToolCallCard',
  component: ToolCallCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(680px, calc(100vw - 32px))' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    name: 'search_web',
    summary: 'Searched the web for CRM pricing',
    status: 'success',
    args: { query: 'CRM pricing 2026', max_results: 5 },
    result: {
      matches: 5,
      top_result: 'Pricing comparison for small sales teams',
    },
    duration: 1420,
  },
} satisfies Meta<typeof ToolCallCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Running: Story = {
  args: {
    status: 'running',
    summary: 'Searching the web for CRM pricing',
    result: undefined,
    duration: undefined,
    startedAt: Date.now(),
  },
};

export const Error: Story = {
  args: {
    name: 'crm.fetch_deals',
    summary: 'Could not load open deals',
    status: 'error',
    error: '403 – the agent has no access to this workspace',
    result: undefined,
    duration: 830,
    onRetry: fn(),
  },
};

export const Group: Story = {
  render: () => (
    <ToolCallGroup defaultOpen label="Checked sales workspace">
      <ToolCallCard
        name="search_web"
        summary="Compared CRM pricing"
        status="success"
        args={{ query: 'CRM pricing 2026' }}
        result={{ matches: 5 }}
        duration={1420}
      />
      <ToolCallCard
        name="crm.list_deals"
        summary="Loaded open deals"
        status="success"
        args={{ stage: 'open', limit: 20 }}
        result={{ count: 12 }}
        duration={680}
      />
      <ToolCallCard
        name="crm.fetch_forecast"
        summary="Could not load forecast"
        status="error"
        error="Forecast service is temporarily unavailable"
        duration={410}
        onRetry={fn()}
      />
    </ToolCallGroup>
  ),
};
