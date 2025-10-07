import { Database } from '@/lib/types';

// Base broadcast group type from database
export type BroadcastGroup = Database['public']['Tables']['broadcast_groups']['Row'] & {
  subscriber_count?: number;
};

// Extended broadcast group type with additional computed properties
export type BroadcastGroupWithStats = BroadcastGroup & {
  subscriber_count: number;
  last_broadcast_sent?: string;
  total_broadcasts_sent?: number;
};

// Broadcast group creation data
export type CreateBroadcastGroupData = {
  name: string;
  description?: string;
  subscriber_ids?: string[];
  emails?: string[];
};

// Broadcast group update data
export type UpdateBroadcastGroupData = {
  name?: string;
  description?: string;
};

// Broadcast group list filters
export type BroadcastGroupFilters = {
  is_default?: boolean;
  search?: string;
};

// Broadcast group list response
export type BroadcastGroupListResponse = {
  data: BroadcastGroup[];
  total: number;
  page: number;
  limit: number;
};

// Broadcast group API error
export type BroadcastGroupApiError = {
  error: string;
  details?: string;
};

// Add subscribers to group data
export type AddSubscribersToGroupData = {
  subscriber_ids?: string[];
  emails?: string[];
};

// Remove subscribers from group data
export type RemoveSubscribersFromGroupData = {
  subscriber_ids: string[];
};
