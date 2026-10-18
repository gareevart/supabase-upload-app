import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThinkingLoader } from "./thinking-loader";

const meta = {
  title: "Gravity UI/ThinkingLoader",
  component: ThinkingLoader,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Animated status indicator for multi-step AI work with controlled and timed phases.",
      },
    },
  },
  args: {
    phases: ["Thinking", "Searching the web", "Reading sources", "Writing response"],
    interval: 2200,
    size: "m",
    variant: "pill",
  },
} satisfies Meta<typeof ThinkingLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Small: Story = {
  args: { size: "s" },
};

export const Plain: Story = {
  args: { variant: "plain" },
};

export const Complete: Story = {
  args: { done: true, doneLabel: "Thought for 6s" },
};

export const ControlledPhase: Story = {
  args: { phase: 2 },
};
