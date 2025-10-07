import type {
  Subscriber,
  CreateSubscriberData,
  UpdateSubscriberData,
  SubscriberFilters,
  SubscriberListResponse,
  SubscriberApiError,
} from '@/entities/subscriber/model';

const API_BASE = '/api/subscribers';

export class SubscriberApi {
  /**
   * Get list of subscribers
   */
  static async getSubscribers(filters?: SubscriberFilters): Promise<SubscriberListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.is_active !== undefined) {
      params.append('active_only', filters.is_active.toString());
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    if (filters?.group_id) {
      params.append('group_id', filters.group_id);
    }

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData: SubscriberApiError = await response.json();
      throw new Error(errorData.error || 'Failed to fetch subscribers');
    }

    return response.json();
  }

  /**
   * Create a new subscriber
   */
  static async createSubscriber(data: CreateSubscriberData): Promise<Subscriber> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: SubscriberApiError = await response.json();
      throw new Error(errorData.error || 'Failed to create subscriber');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update a subscriber
   */
  static async updateSubscriber(id: string, data: UpdateSubscriberData): Promise<Subscriber> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: SubscriberApiError = await response.json();
      throw new Error(errorData.error || 'Failed to update subscriber');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Delete a subscriber
   */
  static async deleteSubscriber(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData: SubscriberApiError = await response.json();
      throw new Error(errorData.error || 'Failed to delete subscriber');
    }
  }

  /**
   * Toggle subscriber active status
   */
  static async toggleSubscriberStatus(id: string): Promise<Subscriber> {
    const response = await fetch(`${API_BASE}/${id}/toggle-status`, {
      method: 'PATCH',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData: SubscriberApiError = await response.json();
      throw new Error(errorData.error || 'Failed to toggle subscriber status');
    }

    const result = await response.json();
    return result.data;
  }
}
