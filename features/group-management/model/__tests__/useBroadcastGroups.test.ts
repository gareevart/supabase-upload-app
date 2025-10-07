import { renderHook, waitFor } from '@testing-library/react';
import { useBroadcastGroups } from '../useBroadcastGroups';
import { BroadcastGroupApi } from '@/shared/api/broadcast-groups';
import type { 
  BroadcastGroup, 
  CreateBroadcastGroupData, 
  UpdateBroadcastGroupData,
  AddSubscribersToGroupData,
  RemoveSubscribersFromGroupData,
} from '@/entities/broadcast-group/model';

// Mock the API
jest.mock('@/shared/api/broadcast-groups');
const mockBroadcastGroupApi = BroadcastGroupApi as jest.Mocked<typeof BroadcastGroupApi>;

describe('useBroadcastGroups', () => {
  const mockGroup: BroadcastGroup = {
    id: '1',
    name: 'Test Group',
    description: 'Test Description',
    is_default: false,
    subscriber_count: 5,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch groups on mount', async () => {
    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(() => useBroadcastGroups());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.groups).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groups).toEqual([mockGroup]);
    expect(mockBroadcastGroupApi.getBroadcastGroups).toHaveBeenCalledWith(undefined);
  });

  it('should not fetch groups when autoFetch is false', () => {
    renderHook(() => useBroadcastGroups({ autoFetch: false }));

    expect(mockBroadcastGroupApi.getBroadcastGroups).not.toHaveBeenCalled();
  });

  it('should create a group', async () => {
    const newGroup: BroadcastGroup = {
      ...mockGroup,
      id: '2',
      name: 'New Group',
    };

    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.createBroadcastGroup.mockResolvedValue(newGroup);

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const createData: CreateBroadcastGroupData = {
      name: 'New Group',
      description: 'New Description',
    };

    await result.current.createGroup(createData);

    expect(mockBroadcastGroupApi.createBroadcastGroup).toHaveBeenCalledWith(createData);
    expect(result.current.groups).toContain(newGroup);
  });

  it('should update a group', async () => {
    const updatedGroup: BroadcastGroup = {
      ...mockGroup,
      name: 'Updated Group',
    };

    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.updateBroadcastGroup.mockResolvedValue(updatedGroup);

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updateData: UpdateBroadcastGroupData = {
      name: 'Updated Group',
    };

    await result.current.updateGroup('1', updateData);

    expect(mockBroadcastGroupApi.updateBroadcastGroup).toHaveBeenCalledWith('1', updateData);
    expect(result.current.groups[0]).toEqual(updatedGroup);
  });

  it('should delete groups', async () => {
    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.deleteBroadcastGroups.mockResolvedValue();

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.deleteGroups(['1']);

    expect(mockBroadcastGroupApi.deleteBroadcastGroups).toHaveBeenCalledWith(['1']);
    expect(result.current.groups).toEqual([]);
  });

  it('should get group subscribers', async () => {
    const mockSubscribers = [
      { id: '1', email: 'test@example.com', name: 'Test User' },
    ];

    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.getGroupSubscribers.mockResolvedValue({
      data: mockSubscribers,
    });

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const subscribers = await result.current.getGroupSubscribers('1');

    expect(mockBroadcastGroupApi.getGroupSubscribers).toHaveBeenCalledWith('1');
    expect(subscribers).toEqual(mockSubscribers);
  });

  it('should add subscribers to group', async () => {
    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.addSubscribersToGroup.mockResolvedValue({
      added_count: 2,
    });

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const addData: AddSubscribersToGroupData = {
      emails: ['test1@example.com', 'test2@example.com'],
    };

    const response = await result.current.addSubscribersToGroup('1', addData);

    expect(mockBroadcastGroupApi.addSubscribersToGroup).toHaveBeenCalledWith('1', addData);
    expect(response).toEqual({ added_count: 2 });
  });

  it('should remove subscribers from group', async () => {
    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    mockBroadcastGroupApi.removeSubscribersFromGroup.mockResolvedValue();

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const removeData: RemoveSubscribersFromGroupData = {
      subscriber_ids: ['1', '2'],
    };

    await result.current.removeSubscribersFromGroup('1', removeData);

    expect(mockBroadcastGroupApi.removeSubscribersFromGroup).toHaveBeenCalledWith('1', removeData);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch groups';
    mockBroadcastGroupApi.getBroadcastGroups.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.groups).toEqual([]);
  });

  it('should refetch data', async () => {
    mockBroadcastGroupApi.getBroadcastGroups.mockResolvedValue({
      data: [mockGroup],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(() => useBroadcastGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the mock to verify it's called again
    mockBroadcastGroupApi.getBroadcastGroups.mockClear();

    await result.current.refetch();

    expect(mockBroadcastGroupApi.getBroadcastGroups).toHaveBeenCalledTimes(1);
  });
});
