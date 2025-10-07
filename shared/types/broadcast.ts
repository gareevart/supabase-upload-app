import { Database } from '@/lib/types';

// Base types from database
export type Broadcast = Database['public']['Tables']['sent_mails']['Row'];
export type Subscriber = Database['public']['Tables']['subscribe']['Row'];
export type BroadcastGroup = Database['public']['Tables']['broadcast_groups']['Row'] & {
  subscriber_count?: number;
};

// API types
export type NewBroadcast = {
  subject: string;
  content: any;
  recipients: string[];
  group_ids?: string[];
  scheduled_for?: string | null;
  status?: BroadcastStatus;
};

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export type BroadcastStats = {
  total: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
};

// Form types
export type BroadcastFormData = {
  subject: string;
  content: any;
  recipients: string[];
  group_ids?: string[];
  scheduled_for?: Date | null;
};

// API Response types
export type BroadcastsResponse = {
  data: Broadcast[];
  count: number;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
};

export type BroadcastResponse = {
  data: Broadcast;
};

// Error types
export type BroadcastError = {
  error: string;
  details?: string;
  code?: string;
  timestamp?: string;
};

// Filter types
export type BroadcastFilters = {
  status?: BroadcastStatus;
  limit?: number;
  offset?: number;
};
