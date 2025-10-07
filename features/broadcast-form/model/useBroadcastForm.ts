import { useState, useCallback } from 'react';
import { Broadcast, NewBroadcast, BroadcastFormData } from '@/entities/broadcast/model';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';

export const useBroadcastForm = (initialData?: Partial<Broadcast>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const saveAsDraft = useCallback(async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.createBroadcast({
        ...data,
        status: 'draft',
        scheduled_for: null,
      });
      
      toast({
        title: 'Success',
        description: 'Broadcast saved as draft',
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save broadcast';
      console.error('Error saving broadcast:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const updateDraft = useCallback(async (id: string, data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.updateBroadcast(id, {
        ...data,
        status: 'draft',
        scheduled_for: null,
      });
      
      toast({
        title: 'Success',
        description: 'Broadcast updated successfully',
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update broadcast';
      console.error('Error updating broadcast:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const scheduleBroadcast = useCallback(async (data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.createBroadcast({
        ...data,
        status: 'scheduled',
        scheduled_for: date.toISOString(),
      });
      
      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule broadcast';
      console.error('Error scheduling broadcast:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const updateSchedule = useCallback(async (id: string, data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.updateBroadcast(id, {
        ...data,
        status: 'scheduled',
        scheduled_for: date.toISOString(),
      });
      
      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule broadcast';
      console.error('Error scheduling broadcast:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const sendNow = useCallback(async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First save the broadcast
      const response = await BroadcastApi.createBroadcast(data);
      
      // Then send it
      await BroadcastApi.sendBroadcast(response.data.id);
      
      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send broadcast';
      console.error('Error sending broadcast:', err);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const updateAndSend = useCallback(async (id: string, data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First update the broadcast
      await BroadcastApi.updateBroadcast(id, data);
      
      // Then send it
      await BroadcastApi.sendBroadcast(id);
      
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
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  return {
    isSubmitting,
    saveAsDraft,
    updateDraft,
    scheduleBroadcast,
    updateSchedule,
    sendNow,
    updateAndSend,
  };
};
