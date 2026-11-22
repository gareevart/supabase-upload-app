import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react';
import type { useMarkdownEditor } from '@gravity-ui/markdown-editor';

type MarkdownEditorInstance = ReturnType<typeof useMarkdownEditor>;

const TOOLBAR_SELECTOR = '[data-layout="sticky-toolbar"]';
const PLACEHOLDER_CLASS = 'markdown-editor__toolbar-placeholder';

type ToolbarHome = {
  parent: HTMLElement;
  nextSibling: ChildNode | null;
};

export function useEditorToolbarInActionBar(
  editor: MarkdownEditorInstance,
  editorRootRef: RefObject<HTMLDivElement | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  options?: {
    pinOffsetTop?: number;
    onPinnedChange?: (pinned: boolean) => void;
  },
) {
  const pinOffsetTop = options?.pinOffsetTop ?? 40;
  const onPinnedChange = options?.onPinnedChange;

  const pinnedRef = useRef(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const homeRef = useRef<ToolbarHome | null>(null);

  const getInlineToolbar = useCallback(() => {
    if (!editorRootRef.current) return null;
    return editorRootRef.current.querySelector(TOOLBAR_SELECTOR) as HTMLElement | null;
  }, [editorRootRef]);

  const getHostedToolbar = useCallback(() => {
    if (!hostRef.current) return null;
    return hostRef.current.querySelector(TOOLBAR_SELECTOR) as HTMLElement | null;
  }, [hostRef]);

  const moveToolbarToHost = useCallback(() => {
    if (!hostRef.current) return;

    let toolbar = getInlineToolbar();
    if (!toolbar) {
      toolbar = getHostedToolbar();
    }
    if (!toolbar || toolbar.parentElement === hostRef.current) {
      return;
    }

    if (!homeRef.current) {
      homeRef.current = {
        parent: toolbar.parentElement as HTMLElement,
        nextSibling: toolbar.nextSibling,
      };
    }

    if (!placeholderRef.current && homeRef.current) {
      const placeholder = document.createElement('div');
      placeholder.className = PLACEHOLDER_CLASS;
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.height = `${toolbar.offsetHeight}px`;
      placeholder.style.width = '100%';
      homeRef.current.parent.insertBefore(placeholder, toolbar);
      placeholderRef.current = placeholder;
    }

    hostRef.current.appendChild(toolbar);
  }, [getHostedToolbar, getInlineToolbar, hostRef]);

  const moveToolbarToEditor = useCallback(() => {
    const toolbar = getHostedToolbar() ?? getInlineToolbar();
    const home = homeRef.current;
    if (!toolbar || !home) {
      return;
    }

    if (home.nextSibling) {
      home.parent.insertBefore(toolbar, home.nextSibling);
    } else {
      home.parent.appendChild(toolbar);
    }

    placeholderRef.current?.remove();
    placeholderRef.current = null;
    homeRef.current = null;
  }, [getHostedToolbar, getInlineToolbar]);

  const setPinned = useCallback(
    (pinned: boolean) => {
      if (pinnedRef.current === pinned) {
        return;
      }
      pinnedRef.current = pinned;
      onPinnedChange?.(pinned);
    },
    [onPinnedChange],
  );

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    if (pinnedRef.current) {
      moveToolbarToHost();
    } else {
      moveToolbarToEditor();
    }
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let observer: IntersectionObserver | undefined;

    const disconnect = () => {
      observer?.disconnect();
      observer = undefined;
    };

    const observeInlineToolbar = () => {
      if (pinnedRef.current) {
        return;
      }

      const toolbar = getInlineToolbar();
      if (!toolbar) {
        return;
      }

      disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry || pinnedRef.current) {
            return;
          }
          const scrolledAboveChrome =
            !entry.isIntersecting && entry.boundingClientRect.top < pinOffsetTop;
          if (scrolledAboveChrome) {
            setPinned(true);
          }
        },
        {
          root: null,
          rootMargin: `-${pinOffsetTop}px 0px 0px 0px`,
          threshold: [0, 1],
        },
      );
      observer.observe(toolbar);
    };

    const observePlaceholder = () => {
      const placeholder = placeholderRef.current;
      if (!placeholder || !pinnedRef.current) {
        return;
      }

      disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || !pinnedRef.current) {
            return;
          }
          setPinned(false);
        },
        {
          root: null,
          rootMargin: `-${pinOffsetTop}px 0px 0px 0px`,
          threshold: 0,
        },
      );
      observer.observe(placeholder);
    };

    const syncObservation = () => {
      requestAnimationFrame(() => {
        if (pinnedRef.current) {
          observePlaceholder();
        } else {
          observeInlineToolbar();
        }
      });
    };

    syncObservation();

    const onEditorUpdate = () => {
      if (pinnedRef.current) {
        moveToolbarToHost();
      }
      syncObservation();
    };

    editor.on('rerender-toolbar', onEditorUpdate);
    editor.on('rerender', onEditorUpdate);
    window.addEventListener('scroll', syncObservation, { passive: true });
    window.addEventListener('resize', syncObservation);

    return () => {
      editor.off('rerender-toolbar', onEditorUpdate);
      editor.off('rerender', onEditorUpdate);
      window.removeEventListener('scroll', syncObservation);
      window.removeEventListener('resize', syncObservation);
      disconnect();
      pinnedRef.current = false;
      moveToolbarToEditor();
    };
  }, [
    editor,
    enabled,
    getInlineToolbar,
    moveToolbarToEditor,
    moveToolbarToHost,
    pinOffsetTop,
    setPinned,
  ]);
}