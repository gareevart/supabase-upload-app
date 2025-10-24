import { useState, useEffect, useCallback } from 'react';
import { Broadcast, BroadcastStats } from '@/entities/broadcast/model';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';

export const useBroadcastDetail = (id: string) => {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [stats, setStats] = useState<BroadcastStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBroadcast = useCallback(async () => {
    try {
      console.log('🔄 Starting to fetch broadcast detail for ID:', id);
      setIsLoading(true);
      setError(null);

      const response = await BroadcastApi.getBroadcast(id);
      const broadcastData = response.data;
      console.log('✅ Broadcast detail response:', broadcastData);
      setBroadcast(broadcastData);

      // Calculate stats if broadcast is sent
      if (broadcastData.status === 'sent') {
        const total = broadcastData.total_recipients || 0;
        const opened = broadcastData.opened_count || 0;
        const clicked = broadcastData.clicked_count || 0;

        const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
        const clickRate = total > 0 ? Math.round((clicked / total) * 100) : 0;

        setStats({
          total,
          opened,
          clicked,
          openRate,
          clickRate,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch broadcast';
      setError(errorMessage);
      console.error('❌ Error fetching broadcast:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Finished fetching broadcast detail, setting loading to false');
      setIsLoading(false);
    }
  }, [id, toast]);

  const deleteBroadcast = useCallback(async () => {
    if (!broadcast) return;

    try {
      await BroadcastApi.deleteBroadcast(broadcast.id);

      toast({
        title: 'Success',
        description: 'Broadcast deleted successfully',
      });

      return true; // Indicate success for navigation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete broadcast';
      console.error('Error deleting broadcast:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    }
  }, [broadcast, toast]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcast) return;

    try {
      await BroadcastApi.sendBroadcast(broadcast.id);

      // Update local state
      setBroadcast(prev => prev ? { ...prev, status: 'sent' } : prev);

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
  }, [broadcast, toast]);

  const scheduleBroadcast = useCallback(async (date: Date) => {
    if (!broadcast) return;

    try {
      await BroadcastApi.scheduleBroadcast(broadcast.id, date.toISOString());

      // Update local state
      setBroadcast(prev => prev ? { ...prev, status: 'scheduled', scheduled_for: date.toISOString() } : prev);

      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule broadcast';
      console.error('Error scheduling broadcast:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [broadcast, toast]);

  const cancelSchedule = useCallback(async () => {
    if (!broadcast) return;

    try {
      await BroadcastApi.cancelSchedule(broadcast.id);

      // Update local state
      setBroadcast(prev => prev ? { ...prev, status: 'draft', scheduled_for: null } : prev);

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
  }, [broadcast, toast]);

  useEffect(() => {
    console.log('🚀 useBroadcastDetail useEffect triggered for ID:', id);
    // Only run on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('❌ Running on server side, skipping fetch');
      return;
    }

    console.log('✅ Running on client side, fetching broadcast detail');
    fetchBroadcast();
  }, [id]); // Re-fetch when id changes

  return {
    broadcast,
    stats,
    isLoading,
    error,
    refresh: fetchBroadcast,
    deleteBroadcast,
    sendBroadcast,
    scheduleBroadcast,
    cancelSchedule,
  };
};
