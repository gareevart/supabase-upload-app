import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BlogPostCard, type BlogPost } from './BlogPostCard';

const mockPost: BlogPost = {
  id: 'post-1',
  title: 'Building with Gravity UI and Next.js',
  excerpt:
    'A practical guide to implementing design-system components in a Next.js App Router project with FSD architecture.',
  slug: 'building-with-gravity-ui',
  featured_image: 'https://picsum.photos/seed/gareev-blog/800/450',
  created_at: '2025-06-15T10:00:00.000Z',
  author_id: 'author-1',
  author: {
    name: 'Dmitry Gareev',
    username: 'gareev',
    avatar_url: null,
  },
};

const meta = {
  title: 'Shared/UI/BlogPostCard',
  component: BlogPostCard,
  parameters: {
    layout: 'centered',
  },
  args: {
    post: mockPost,
    gridView: true,
    showReadButton: true,
    isDraft: false,
    isDeleting: false,
    onReadClick: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  argTypes: {
    gridView: {
      control: 'boolean',
      description: 'Grid (vertical) or list (horizontal) layout',
    },
    isDraft: {
      control: 'boolean',
    },
    showReadButton: {
      control: 'boolean',
    },
    isDeleting: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof BlogPostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GridView: Story = {
  name: 'Grid view',
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: true,
  },
};

export const ListView: Story = {
  name: 'List view',
  decorators: [
    (Story) => (
      <div style={{ width: 900, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: false,
  },
};

export const Draft: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: true,
    isDraft: true,
    post: {
      ...mockPost,
      slug: null,
    },
  },
};

export const SearchResult: Story = {
  name: 'Search result',
  decorators: [
    (Story) => (
      <div style={{ width: 900, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: false,
    post: {
      ...mockPost,
      excerpt: null,
      searchContext: {
        context: '...implementing design-system components in a Next.js App Router project...',
        highlightedContext:
          '...implementing <mark>design-system</mark> components in a <mark>Next.js</mark> App Router project...',
      },
    },
  },
};

export const WithoutImage: Story = {
  name: 'Without image',
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: true,
    post: {
      ...mockPost,
      featured_image: null,
    },
  },
};

export const WithoutExcerpt: Story = {
  name: 'Without excerpt',
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    gridView: true,
    post: {
      ...mockPost,
      excerpt: null,
    },
  },
};

export const Playground: Story = {
  decorators: [
    (Story, context) => (
      <div style={{ width: context.args.gridView ? 400 : 900, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
};
