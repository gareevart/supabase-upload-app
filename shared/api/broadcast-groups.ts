import type {
  BroadcastGroup,
  CreateBroadcastGroupData,
  UpdateBroadcastGroupData,
  BroadcastGroupFilters,
  BroadcastGroupListResponse,
  BroadcastGroupApiError,
  AddSubscribersToGroupData,
  RemoveSubscribersFromGroupData,
} from '@/entities/broadcast-group/model';

const API_BASE = '/api/broadcast-groups';

export class BroadcastGroupApi {
  /**
   * Get list of broadcast groups
   */
  static async getBroadcastGroups(filters?: BroadcastGroupFilters): Promise<BroadcastGroupListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.is_default !== undefined) {
      params.append('is_default', filters.is_default.toString());
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to fetch broadcast groups');
    }

    return response.json();
  }

  /**
   * Create a new broadcast group
   */
  static async createBroadcastGroup(data: CreateBroadcastGroupData): Promise<BroadcastGroup> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to create broadcast group');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update a broadcast group
   */
  static async updateBroadcastGroup(id: string, data: UpdateBroadcastGroupData): Promise<BroadcastGroup> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to update broadcast group');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Delete broadcast groups
   */
  static async deleteBroadcastGroups(groupIds: string[]): Promise<void> {
    const response = await fetch(API_BASE, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ group_ids: groupIds }),
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to delete broadcast groups');
    }
  }

  /**
   * Get subscribers in a group
   */
  static async getGroupSubscribers(groupId: string): Promise<{ data: any[] }> {
    const response = await fetch(`${API_BASE}/${groupId}/subscribers`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to fetch group subscribers');
    }

    return response.json();
  }

  /**
   * Add subscribers to a group
   */
  static async addSubscribersToGroup(groupId: string, data: AddSubscribersToGroupData): Promise<{ added_count: number }> {
    const response = await fetch(`${API_BASE}/${groupId}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to add subscribers to group');
    }

    return response.json();
  }

  /**
   * Remove subscribers from a group
   */
  static async removeSubscribersFromGroup(groupId: string, data: RemoveSubscribersFromGroupData): Promise<void> {
    const response = await fetch(`${API_BASE}/${groupId}/subscribers`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: BroadcastGroupApiError = await response.json();
      throw new Error(errorData.error || 'Failed to remove subscribers from group');
    }
  }
}
