import { Broadcast, NewBroadcast, BroadcastsResponse, BroadcastResponse, BroadcastFilters, BroadcastError } from '@/shared/types/broadcast';

const API_BASE = '/api/broadcasts';

export class BroadcastApi {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorData: BroadcastError;
        try {
          errorData = await response.json();
          console.log('🔴 Error response body:', errorData);
        } catch (e) {
          errorData = {
            error: 'Unknown error',
            details: `HTTP ${response.status} ${response.statusText}`,
          };
          console.log('🔴 Could not parse error response');
        }

        // Log detailed error for debugging
        console.error('🔴 Broadcast API Error:', {
          endpoint: `${API_BASE}${endpoint}`,
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          timestamp: new Date().toISOString()
        });

        // If unauthorized, provide helpful message
        if (response.status === 401) {
          throw new Error('Не авторизован. Пожалуйста, войдите в систему через /auth');
        }

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      // Log any network errors
      if (error instanceof TypeError) {
        console.error('🔴 Network error:', error);
        throw new Error('Ошибка сети. Проверьте подключение к серверу.');
      }
      console.error('🔴 Request error:', error);
      throw error;
    }
  }

  static async getBroadcasts(filters: BroadcastFilters = {}): Promise<BroadcastsResponse> {
    const params = new URLSearchParams();

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.request<BroadcastsResponse>(endpoint);
  }

  static async getBroadcast(id: string): Promise<BroadcastResponse> {
    return this.request<BroadcastResponse>(`/${id}`);
  }

  static async createBroadcast(data: NewBroadcast): Promise<BroadcastResponse> {
    return this.request<BroadcastResponse>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateBroadcast(id: string, data: Partial<NewBroadcast>): Promise<BroadcastResponse> {
    return this.request<BroadcastResponse>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteBroadcast(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  static async sendBroadcast(id: string): Promise<void> {
    await this.request<void>('/send', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  static async scheduleBroadcast(id: string, scheduledFor: string): Promise<void> {
    await this.request<void>('/schedule', {
      method: 'POST',
      body: JSON.stringify({ id, scheduled_for: scheduledFor }),
    });
  }

  static async cancelSchedule(id: string): Promise<void> {
    await this.request<void>(`/schedule?id=${id}`, {
      method: 'DELETE',
    });
  }
}
