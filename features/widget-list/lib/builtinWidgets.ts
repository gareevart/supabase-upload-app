// Built-in widgets (Calculator, Camera) can be hidden from the navigation
// widgets panel. The setting is per-device, stored in localStorage.
export type BuiltinWidgetId = 'calculator' | 'camera';

export const BUILTIN_WIDGETS: BuiltinWidgetId[] = ['calculator', 'camera'];

export const BUILTIN_WIDGETS_STORAGE_KEY = 'builtin-widgets-enabled';
export const BUILTIN_WIDGETS_EVENT = 'builtinWidgetsChanged';

export type BuiltinWidgetsState = Record<BuiltinWidgetId, boolean>;

const DEFAULT_STATE: BuiltinWidgetsState = {
  calculator: true,
  camera: true,
};

export const getBuiltinWidgetsState = (): BuiltinWidgetsState => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(BUILTIN_WIDGETS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      calculator: parsed.calculator !== false,
      camera: parsed.camera !== false,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

export const setBuiltinWidgetEnabled = (id: BuiltinWidgetId, enabled: boolean) => {
  if (typeof window === 'undefined') return;
  const next = { ...getBuiltinWidgetsState(), [id]: enabled };
  window.localStorage.setItem(BUILTIN_WIDGETS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BUILTIN_WIDGETS_EVENT, { detail: next }));
};
