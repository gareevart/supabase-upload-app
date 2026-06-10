import { NewWidget, UserWidget, WidgetError, WidgetGrant, WidgetPermission } from '@/shared/types/widget';

const API_BASE = '/api/widgets';

export class WidgetApi {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorData: WidgetError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: 'Unknown error',
          details: `HTTP ${response.status} ${response.statusText}`,
        };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async getMyWidgets(): Promise<{ data: UserWidget[] }> {
    return this.request('');
  }

  static async getPublicWidgets(): Promise<{ data: UserWidget[] }> {
    return this.request('/public');
  }

  static async getEnabledWidgets(): Promise<{ data: UserWidget[] }> {
    return this.request('/enabled');
  }

  static async getWidget(id: string): Promise<{ data: UserWidget; grant: WidgetGrant | null }> {
    return this.request(`/${id}`);
  }

  static async createWidget(widget: NewWidget): Promise<{ data: UserWidget }> {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(widget),
    });
  }

  static async updateWidget(
    id: string,
    updates: Partial<Pick<NewWidget, 'title' | 'description' | 'is_public'>>
  ): Promise<{ data: UserWidget }> {
    return this.request(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  static async deleteWidget(id: string): Promise<{ success: boolean }> {
    return this.request(`/${id}`, { method: 'DELETE' });
  }

  static async grantPermissions(
    id: string,
    permissions: WidgetPermission[]
  ): Promise<{ data: WidgetGrant }> {
    return this.request(`/${id}/grants`, {
      method: 'POST',
      body: JSON.stringify({ permissions }),
    });
  }

  static async setWidgetEnabled(id: string, enabled: boolean): Promise<{ data: WidgetGrant }> {
    return this.request(`/${id}/grants`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }

  static async getStorageValue(id: string, key: string): Promise<{ value: unknown }> {
    return this.request(`/${id}/storage?key=${encodeURIComponent(key)}`);
  }

  static async setStorageValue(id: string, key: string, value: unknown): Promise<{ success: boolean }> {
    return this.request(`/${id}/storage`, {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }
}
