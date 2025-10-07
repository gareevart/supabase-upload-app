import { Database } from '@/lib/types';

// Base subscriber type from database
export type Subscriber = Database['public']['Tables']['subscribe']['Row'];

// Extended subscriber type with additional computed properties
export type SubscriberWithStats = Subscriber & {
  group_count?: number;
  last_broadcast_received?: string;
};

// Subscriber creation data
export type CreateSubscriberData = {
  email: string;
  name?: string;
};

// Subscriber update data
export type UpdateSubscriberData = {
  name?: string;
  is_active?: boolean;
};

// Subscriber list filters
export type SubscriberFilters = {
  is_active?: boolean;
  search?: string;
  group_id?: string;
};

// Subscriber list response
export type SubscriberListResponse = {
  data: Subscriber[];
  total: number;
  page: number;
  limit: number;
};

// Subscriber API error
export type SubscriberApiError = {
  error: string;
  details?: string;
};
