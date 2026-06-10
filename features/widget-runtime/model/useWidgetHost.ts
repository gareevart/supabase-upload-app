"use client";

import { RefObject, useCallback, useEffect, useRef } from 'react';
import { useToaster } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import { uploadFile, getPublicUrl } from '@/lib/yandexStorage';
import { WidgetApi } from '@/shared/api/widgets';
import { WidgetPermission } from '@/shared/types/widget';
import { useI18n } from '@/app/contexts/I18nContext';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface WidgetHostOptions {
  // Saved widget id; preview widgets (not saved yet) keep storage in memory
  widgetId?: string | null;
  grantedPermissions: WidgetPermission[];
  // Host-side camera broker: opens the camera UI and resolves with the photo URL
  onCameraRequest?: () => Promise<string>;
}

interface WidgetRpcMessage {
  __widgetSdk: true;
  id?: string;
  type?: string;
  method?: string;
  params?: Record<string, unknown>;
}

const detectTheme = (): 'light' | 'dark' => {
  if (typeof document === 'undefined') return 'light';
  const root = document.querySelector('.g-root');
  return root?.classList.contains('g-root_theme_dark') ? 'dark' : 'light';
};

const dataUrlToFile = (dataUrl: string, name: string): File | null => {
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  if (!mime.startsWith('image/')) return null;
  try {
    const binary = atob(match[2]);
    if (binary.length > MAX_UPLOAD_BYTES) return null;
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], name, { type: mime });
  } catch {
    return null;
  }
};

export function useWidgetHost(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  options: WidgetHostOptions
) {
  const toaster = useToaster();
  const { language } = useI18n();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const memoryStorageRef = useRef<Map<string, unknown>>(new Map());

  const sendInit = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { __widgetSdk: true, type: 'init', theme: detectTheme(), lang: language },
      '*'
    );
  }, [iframeRef, language]);

  useEffect(() => {
    const getUserId = async (): Promise<string> => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        throw new Error('Not authenticated');
      }
      return data.session.user.id;
    };

    const handleMethod = async (method: string, params: Record<string, unknown>) => {
      const { widgetId, grantedPermissions, onCameraRequest } = optionsRef.current;

      const requirePermission = (permission: WidgetPermission) => {
        if (!grantedPermissions.includes(permission)) {
          throw new Error(`Permission "${permission}" is not granted`);
        }
      };

      switch (method) {
        case 'profile.get': {
          requirePermission('profile');
          const userId = await getUserId();
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (error) throw new Error(error.message);
          const profile = data as Record<string, unknown>;
          return {
            name: profile.name ?? null,
            username: profile.username ?? null,
            avatar_url: profile.avatar_url ?? null,
            bio: profile.bio ?? null,
          };
        }

        case 'gallery.list': {
          requirePermission('gallery');
          const userId = await getUserId();
          const { data, error } = await supabase
            .from('images')
            .select('id, file_name, public_url')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);
          if (error) throw new Error(error.message);
          return (data || [])
            .filter((image) => image.public_url)
            .map((image) => ({ id: image.id, name: image.file_name, url: image.public_url }));
        }

        case 'gallery.upload': {
          requirePermission('gallery');
          const userId = await getUserId();
          const dataUrl = typeof params.dataUrl === 'string' ? params.dataUrl : '';
          const name =
            typeof params.name === 'string' && params.name.trim()
              ? params.name.trim().replace(/[^\w.-]+/g, '_').slice(0, 100)
              : `widget-${Date.now()}.png`;
          const file = dataUrlToFile(dataUrl, name);
          if (!file) {
            throw new Error('Invalid image data');
          }
          const { data: uploadData, error: uploadError } = await uploadFile(
            file,
            `profiles/${userId}`,
            userId
          );
          if (uploadError || !uploadData?.path) {
            throw new Error('Upload failed');
          }
          const url = await getPublicUrl(uploadData.path);
          const { error: insertError } = await supabase.from('images').insert([
            {
              user_id: userId,
              file_name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              mime_type: file.type,
              public_url: url,
            },
          ]);
          if (insertError) {
            console.error('Failed to save image metadata', insertError);
          }
          window.dispatchEvent(new CustomEvent('fileUploaded'));
          return { name: file.name, url };
        }

        case 'camera.takePhoto': {
          requirePermission('camera');
          if (!onCameraRequest) {
            throw new Error('Camera is not available');
          }
          const url = await onCameraRequest();
          return { url };
        }

        case 'storage.get': {
          requirePermission('storage');
          const key = typeof params.key === 'string' ? params.key : '';
          if (!key) throw new Error('key is required');
          if (!widgetId) {
            return memoryStorageRef.current.get(key) ?? null;
          }
          const { value } = await WidgetApi.getStorageValue(widgetId, key);
          return value;
        }

        case 'storage.set': {
          requirePermission('storage');
          const key = typeof params.key === 'string' ? params.key : '';
          if (!key) throw new Error('key is required');
          if (!widgetId) {
            memoryStorageRef.current.set(key, params.value ?? null);
            return { success: true };
          }
          await WidgetApi.setStorageValue(widgetId, key, params.value ?? null);
          return { success: true };
        }

        case 'ui.toast': {
          const text = typeof params.text === 'string' ? params.text.slice(0, 200) : '';
          if (text) {
            toaster.add({
              name: `widget-toast-${Date.now()}`,
              title: text,
              theme: 'info',
              autoHiding: 4000,
            });
          }
          return { success: true };
        }

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const data = event.data as WidgetRpcMessage;
      if (!data || data.__widgetSdk !== true) return;

      if (data.type === 'sdk-ready') {
        sendInit();
        return;
      }

      if (!data.id || typeof data.method !== 'string') return;

      const respond = (result: unknown, error?: string) => {
        iframe.contentWindow?.postMessage(
          { __widgetSdk: true, id: data.id, result: error ? undefined : result, error },
          '*'
        );
      };

      handleMethod(data.method, data.params || {})
        .then((result) => respond(result))
        .catch((methodError: unknown) => {
          respond(undefined, methodError instanceof Error ? methodError.message : 'Widget call failed');
        });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef, sendInit, toaster]);

  // Re-send init when theme or language changes
  useEffect(() => {
    sendInit();
  }, [sendInit]);
}
