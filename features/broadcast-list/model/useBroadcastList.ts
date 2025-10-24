import { useState, useEffect, useCallback } from 'react';
import { Broadcast, BroadcastFilters, BroadcastStatus } from '@/entities/broadcast/model';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';

export const useBroadcastList = (initialFilters: BroadcastFilters = {}) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BroadcastFilters>(initialFilters);
  const { toast } = useToast();

  const fetchBroadcasts = useCallback(async () => {
    try {
      console.log('🔄 Starting to fetch broadcasts...');
      setIsLoading(true);
      setError(null);

      console.log('Fetching broadcasts with filters:', filters);
      const response = await BroadcastApi.getBroadcasts(filters);
      console.log('✅ Broadcasts response:', response);
      console.log('📊 Setting broadcasts data:', response.data);
      setBroadcasts(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch broadcasts';
      setError(errorMessage);
      console.error('❌ Error fetching broadcasts:', err);

      // Only show toast for non-auth errors to avoid spam
      if (!errorMessage.includes('авторизован') && !errorMessage.includes('Unauthorized')) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      console.log('🏁 Finished fetching broadcasts, setting loading to false');
      setIsLoading(false);
    }
  }, [filters, toast]);

  const updateFilters = useCallback((newFilters: Partial<BroadcastFilters>) => {
    console.log('Updating filters:', newFilters);
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      console.log('New filters state:', updated);
      return updated;
    });
  }, []);

  const refresh = useCallback(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const deleteBroadcast = useCallback(async (id: string) => {
    try {
      await BroadcastApi.deleteBroadcast(id);
      setBroadcasts(prev => prev.filter(broadcast => broadcast.id !== id));

      toast({
        title: 'Success',
        description: 'Broadcast deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete broadcast';
      console.error('Error deleting broadcast:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const sendBroadcast = useCallback(async (id: string) => {
    try {
      await BroadcastApi.sendBroadcast(id);
      setBroadcasts(prev =>
        prev.map(broadcast =>
          broadcast.id === id ? { ...broadcast, status: 'sent' } : broadcast
        )
      );

      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send broadcast';
      console.error('Error sending broadcast:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const cancelSchedule = useCallback(async (id: string) => {
    try {
      await BroadcastApi.cancelSchedule(id);
      setBroadcasts(prev =>
        prev.map(broadcast =>
          broadcast.id === id ? { ...broadcast, status: 'draft', scheduled_for: null } : broadcast
        )
      );

      toast({
        title: 'Success',
        description: 'Broadcast schedule cancelled',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel schedule';
      console.error('Error cancelling schedule:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    console.log('🚀 useBroadcastList useEffect triggered');
    // Only run on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('❌ Running on server side, skipping fetch');
      return;
    }

    console.log('✅ Running on client side, fetching broadcasts');
    // Fetch broadcasts when filters change
    let isMounted = true;

    const loadBroadcasts = async () => {
      if (isMounted) {
        console.log('📡 Calling fetchBroadcasts...');
        await fetchBroadcasts();
      }
    };

    loadBroadcasts();

    return () => {
      console.log('🧹 Cleaning up useEffect');
      isMounted = false;
    };
  }, [filters]); // Re-fetch when filters change

  return {
    broadcasts,
    isLoading,
    error,
    filters,
    updateFilters,
    refresh,
    deleteBroadcast,
    sendBroadcast,
    cancelSchedule,
  };
};
