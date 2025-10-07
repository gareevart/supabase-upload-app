import { useState, useEffect, useCallback } from 'react';
import { SubscriberApi } from '@/shared/api/subscribers';
import type {
  Subscriber,
  CreateSubscriberData,
  UpdateSubscriberData,
  SubscriberFilters,
} from '@/entities/subscriber/model';

export interface UseSubscribersOptions {
  filters?: SubscriberFilters;
  autoFetch?: boolean;
}

export interface UseSubscribersReturn {
  subscribers: Subscriber[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSubscriber: (data: CreateSubscriberData) => Promise<Subscriber>;
  updateSubscriber: (id: string, data: UpdateSubscriberData) => Promise<Subscriber>;
  deleteSubscriber: (id: string) => Promise<void>;
  toggleSubscriberStatus: (id: string) => Promise<Subscriber>;
}

export const useSubscribers = (options: UseSubscribersOptions = {}): UseSubscribersReturn => {
  const { filters, autoFetch = true } = options;
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await SubscriberApi.getSubscribers(filters);
      setSubscribers(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscribers';
      setError(errorMessage);
      console.error('Error fetching subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const createSubscriber = useCallback(async (data: CreateSubscriberData): Promise<Subscriber> => {
    try {
      setError(null);
      const newSubscriber = await SubscriberApi.createSubscriber(data);
      setSubscribers(prev => [...prev, newSubscriber]);
      return newSubscriber;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscriber';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateSubscriber = useCallback(async (id: string, data: UpdateSubscriberData): Promise<Subscriber> => {
    try {
      setError(null);
      const updatedSubscriber = await SubscriberApi.updateSubscriber(id, data);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscriber';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteSubscriber = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await SubscriberApi.deleteSubscriber(id);
      setSubscribers(prev => prev.filter(sub => sub.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete subscriber';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const toggleSubscriberStatus = useCallback(async (id: string): Promise<Subscriber> => {
    try {
      setError(null);
      const updatedSubscriber = await SubscriberApi.toggleSubscriberStatus(id);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle subscriber status';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSubscribers();
    }
  }, [fetchSubscribers, autoFetch]);

  return {
    subscribers,
    isLoading,
    error,
    refetch: fetchSubscribers,
    createSubscriber,
    updateSubscriber,
    deleteSubscriber,
    toggleSubscriberStatus,
  };
};
