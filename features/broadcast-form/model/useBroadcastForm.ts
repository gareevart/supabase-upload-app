import { useState, useCallback } from 'react';
import { NewBroadcast } from '@/entities/broadcast/model';
import { BroadcastApi } from '@/shared/api/broadcast';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/app/contexts/I18nContext';

export const useBroadcastForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const saveAsDraft = useCallback(async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.createBroadcast({
        ...data,
        status: 'draft',
        scheduled_for: null,
      });
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.draftSaved'),
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.saveFailed');
      console.error('Error saving broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

  const updateDraft = useCallback(async (id: string, data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.updateBroadcast(id, {
        ...data,
        status: 'draft',
        scheduled_for: null,
      });
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.draftUpdated'),
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.updateFailed');
      console.error('Error updating broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

  const scheduleBroadcast = useCallback(async (data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.createBroadcast({
        ...data,
        status: 'scheduled',
        scheduled_for: date.toISOString(),
      });
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.scheduled'),
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.scheduleFailed');
      console.error('Error scheduling broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

  const updateSchedule = useCallback(async (id: string, data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      const response = await BroadcastApi.updateBroadcast(id, {
        ...data,
        status: 'scheduled',
        scheduled_for: date.toISOString(),
      });
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.scheduled'),
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.scheduleFailed');
      console.error('Error scheduling broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

  const sendNow = useCallback(async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First save the broadcast
      const response = await BroadcastApi.createBroadcast(data);
      
      // Then send it
      await BroadcastApi.sendBroadcast(response.data.id);
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.sent'),
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.sendFailed');
      console.error('Error sending broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

  const updateAndSend = useCallback(async (id: string, data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First update the broadcast
      await BroadcastApi.updateBroadcast(id, data);
      
      // Then send it
      await BroadcastApi.sendBroadcast(id);
      
      toast({
        title: t('broadcast.toast.success'),
        description: t('broadcast.toast.sent'),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('broadcast.toast.sendFailed');
      console.error('Error sending broadcast:', err);
      
      toast({
        title: t('broadcast.toast.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [t, toast]);

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
