'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PUSH_ENDPOINT_STORAGE_KEY,
  urlBase64ToUint8Array,
} from '@/shared/lib/push-notifications';

export type BlogPushStatus =
  | 'unsupported'
  | 'disabled'
  | 'default'
  | 'granted'
  | 'denied'
  | 'loading'
  | 'subscribed';

type UseBlogPushNotificationsResult = {
  status: BlogPushStatus;
  isSupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: string | null;
};

const SERVICE_WORKER_PATH = '/push-sw.js';

function getInitialStatus(): BlogPushStatus {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'subscribed';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return 'default';
}

export function useBlogPushNotifications(): UseBlogPushNotificationsResult {
  const [status, setStatus] = useState<BlogPushStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const isSupported = status !== 'unsupported';

  useEffect(() => {
    setStatus(getInitialStatus());
  }, []);

  const subscribe = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setError(null);
    setStatus('loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default');
        return;
      }

      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Push notifications are unavailable');
      }

      const { vapidPublicKey } = await vapidResponse.json() as { vapidPublicKey: string };
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json().catch(() => ({}));
        throw new Error(
          typeof errorData.error === 'string'
            ? errorData.error
            : 'Failed to save push subscription',
        );
      }

      const { endpointArn } = await subscribeResponse.json() as { endpointArn: string };
      localStorage.setItem(PUSH_ENDPOINT_STORAGE_KEY, endpointArn);
      setStatus('subscribed');
    } catch (subscribeError) {
      console.error('[blog-push] subscribe failed:', subscribeError);
      setError(subscribeError instanceof Error ? subscribeError.message : 'Failed to subscribe');
      setStatus(Notification.permission === 'granted' ? 'granted' : 'default');
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setStatus('loading');

    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
      const subscription = await registration?.pushManager.getSubscription();
      const endpointArn = localStorage.getItem(PUSH_ENDPOINT_STORAGE_KEY);

      if (endpointArn) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpointArn }),
        });
        localStorage.removeItem(PUSH_ENDPOINT_STORAGE_KEY);
      }

      await subscription?.unsubscribe();
      await registration?.unregister();

      setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
    } catch (unsubscribeError) {
      console.error('[blog-push] unsubscribe failed:', unsubscribeError);
      setError(unsubscribeError instanceof Error ? unsubscribeError.message : 'Failed to unsubscribe');
      setStatus('subscribed');
    }
  }, []);

  return {
    status,
    isSupported,
    subscribe,
    unsubscribe,
    error,
  };
}
