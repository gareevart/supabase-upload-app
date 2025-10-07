import { useState, useEffect, useCallback } from 'react';
import { BroadcastGroupApi } from '@/shared/api/broadcast-groups';
import type {
  BroadcastGroup,
  CreateBroadcastGroupData,
  UpdateBroadcastGroupData,
  BroadcastGroupFilters,
  AddSubscribersToGroupData,
  RemoveSubscribersFromGroupData,
} from '@/entities/broadcast-group/model';

export interface UseBroadcastGroupsOptions {
  filters?: BroadcastGroupFilters;
  autoFetch?: boolean;
}

export interface UseBroadcastGroupsReturn {
  groups: BroadcastGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createGroup: (data: CreateBroadcastGroupData) => Promise<BroadcastGroup>;
  updateGroup: (id: string, data: UpdateBroadcastGroupData) => Promise<BroadcastGroup>;
  deleteGroups: (groupIds: string[]) => Promise<void>;
  getGroupSubscribers: (groupId: string) => Promise<any[]>;
  addSubscribersToGroup: (groupId: string, data: AddSubscribersToGroupData) => Promise<{ added_count: number }>;
  removeSubscribersFromGroup: (groupId: string, data: RemoveSubscribersFromGroupData) => Promise<void>;
}

export const useBroadcastGroups = (options: UseBroadcastGroupsOptions = {}): UseBroadcastGroupsReturn => {
  const { filters, autoFetch = true } = options;
  
  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await BroadcastGroupApi.getBroadcastGroups(filters);
      setGroups(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch broadcast groups';
      setError(errorMessage);
      console.error('Error fetching broadcast groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const createGroup = useCallback(async (data: CreateBroadcastGroupData): Promise<BroadcastGroup> => {
    try {
      setError(null);
      const newGroup = await BroadcastGroupApi.createBroadcastGroup(data);
      setGroups(prev => [...prev, newGroup]);
      return newGroup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create broadcast group';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateGroup = useCallback(async (id: string, data: UpdateBroadcastGroupData): Promise<BroadcastGroup> => {
    try {
      setError(null);
      const updatedGroup = await BroadcastGroupApi.updateBroadcastGroup(id, data);
      setGroups(prev => 
        prev.map(group => group.id === id ? updatedGroup : group)
      );
      return updatedGroup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update broadcast group';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteGroups = useCallback(async (groupIds: string[]): Promise<void> => {
    try {
      setError(null);
      await BroadcastGroupApi.deleteBroadcastGroups(groupIds);
      setGroups(prev => prev.filter(group => !groupIds.includes(group.id)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete broadcast groups';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getGroupSubscribers = useCallback(async (groupId: string): Promise<any[]> => {
    try {
      setError(null);
      const response = await BroadcastGroupApi.getGroupSubscribers(groupId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch group subscribers';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const addSubscribersToGroup = useCallback(async (groupId: string, data: AddSubscribersToGroupData): Promise<{ added_count: number }> => {
    try {
      setError(null);
      const result = await BroadcastGroupApi.addSubscribersToGroup(groupId, data);
      // Refresh groups to update subscriber counts
      await fetchGroups();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add subscribers to group';
      setError(errorMessage);
      throw err;
    }
  }, [fetchGroups]);

  const removeSubscribersFromGroup = useCallback(async (groupId: string, data: RemoveSubscribersFromGroupData): Promise<void> => {
    try {
      setError(null);
      await BroadcastGroupApi.removeSubscribersFromGroup(groupId, data);
      // Refresh groups to update subscriber counts
      await fetchGroups();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove subscribers from group';
      setError(errorMessage);
      throw err;
    }
  }, [fetchGroups]);

  useEffect(() => {
    if (autoFetch) {
      fetchGroups();
    }
  }, [fetchGroups, autoFetch]);

  return {
    groups,
    isLoading,
    error,
    refetch: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroups,
    getGroupSubscribers,
    addSubscribersToGroup,
    removeSubscribersFromGroup,
  };
};
