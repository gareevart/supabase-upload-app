import { renderHook, waitFor } from '@testing-library/react';
import { useSubscribers } from '../useSubscribers';
import { SubscriberApi } from '@/shared/api/subscribers';
import type { Subscriber, CreateSubscriberData, UpdateSubscriberData } from '@/entities/subscriber/model';

// Mock the API
jest.mock('@/shared/api/subscribers');
const mockSubscriberApi = SubscriberApi as jest.Mocked<typeof SubscriberApi>;

describe('useSubscribers', () => {
  const mockSubscriber: Subscriber = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    is_active: true,
    subscribed_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch subscribers on mount', async () => {
    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(() => useSubscribers());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.subscribers).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscribers).toEqual([mockSubscriber]);
    expect(mockSubscriberApi.getSubscribers).toHaveBeenCalledWith(undefined);
  });

  it('should not fetch subscribers when autoFetch is false', () => {
    renderHook(() => useSubscribers({ autoFetch: false }));

    expect(mockSubscriberApi.getSubscribers).not.toHaveBeenCalled();
  });

  it('should create a subscriber', async () => {
    const newSubscriber: Subscriber = {
      ...mockSubscriber,
      id: '2',
      email: 'new@example.com',
    };

    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockSubscriberApi.createSubscriber.mockResolvedValue(newSubscriber);

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const createData: CreateSubscriberData = {
      email: 'new@example.com',
      name: 'New User',
    };

    await result.current.createSubscriber(createData);

    expect(mockSubscriberApi.createSubscriber).toHaveBeenCalledWith(createData);
    expect(result.current.subscribers).toContain(newSubscriber);
  });

  it('should update a subscriber', async () => {
    const updatedSubscriber: Subscriber = {
      ...mockSubscriber,
      name: 'Updated Name',
    };

    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockSubscriberApi.updateSubscriber.mockResolvedValue(updatedSubscriber);

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updateData: UpdateSubscriberData = {
      name: 'Updated Name',
    };

    await result.current.updateSubscriber('1', updateData);

    expect(mockSubscriberApi.updateSubscriber).toHaveBeenCalledWith('1', updateData);
    expect(result.current.subscribers[0]).toEqual(updatedSubscriber);
  });

  it('should delete a subscriber', async () => {
    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockSubscriberApi.deleteSubscriber.mockResolvedValue();

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.deleteSubscriber('1');

    expect(mockSubscriberApi.deleteSubscriber).toHaveBeenCalledWith('1');
    expect(result.current.subscribers).toEqual([]);
  });

  it('should toggle subscriber status', async () => {
    const toggledSubscriber: Subscriber = {
      ...mockSubscriber,
      is_active: false,
    };

    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockSubscriberApi.toggleSubscriberStatus.mockResolvedValue(toggledSubscriber);

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.toggleSubscriberStatus('1');

    expect(mockSubscriberApi.toggleSubscriberStatus).toHaveBeenCalledWith('1');
    expect(result.current.subscribers[0]).toEqual(toggledSubscriber);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch subscribers';
    mockSubscriberApi.getSubscribers.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.subscribers).toEqual([]);
  });

  it('should refetch data', async () => {
    mockSubscriberApi.getSubscribers.mockResolvedValue({
      data: [mockSubscriber],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(() => useSubscribers());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the mock to verify it's called again
    mockSubscriberApi.getSubscribers.mockClear();

    await result.current.refetch();

    expect(mockSubscriberApi.getSubscribers).toHaveBeenCalledTimes(1);
  });
});
