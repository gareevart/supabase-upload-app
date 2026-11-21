import { useLayoutEffect, useRef } from 'react';

const readBottomOffsetPx = (sheetRoot: HTMLElement | null): number => {
  if (!sheetRoot) {
    return 81;
  }

  const fromSheet = sheetRoot.style.getPropertyValue('--drawer-offset-bottom').trim();
  const fromComputed = getComputedStyle(sheetRoot).getPropertyValue('--drawer-offset-bottom').trim();
  const raw = fromSheet || fromComputed || '81px';
  const value = Number.parseFloat(raw);

  return Number.isFinite(value) ? value : 81;
};

/**
 * Gravity Sheet anchors its panel to the viewport bottom. Nudge translateY so the panel sits above the tab bar.
 */
export function useSheetTabBarAnchor(open: boolean, sheetSelector: string, enabled: boolean) {
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    if (!open || !enabled) {
      return;
    }

    let sheetPanel: HTMLElement | null = null;
    let sheetRoot: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let disposed = false;

    const alignAboveTabBar = () => {
      if (!sheetPanel || !sheetRoot) {
        return;
      }

      const bottomOffset = readBottomOffsetPx(sheetRoot);
      const targetBottom = window.innerHeight - bottomOffset;
      const currentBottom = sheetPanel.getBoundingClientRect().bottom;
      const diff = currentBottom - targetBottom;

      if (Math.abs(diff) < 1) {
        return;
      }

      const transform = sheetPanel.style.transform;
      const match = transform.match(/translate3d\(0,\s*(-?[\d.]+)px,\s*0\)/);
      if (!match) {
        return;
      }

      const translateY = Number.parseFloat(match[1]);
      if (translateY >= 0) {
        return;
      }

      sheetPanel.style.transform = `translate3d(0, ${translateY - diff}px, 0)`;
    };

    const scheduleAlign = () => {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(alignAboveTabBar);
    };

    const attach = () => {
      sheetRoot = document.querySelector(sheetSelector);
      sheetPanel = sheetRoot?.querySelector<HTMLElement>('.g-sheet__sheet') ?? null;
      if (!sheetPanel || !sheetRoot) {
        return false;
      }

      scheduleAlign();

      observer = new MutationObserver(() => {
        scheduleAlign();
      });
      observer.observe(sheetPanel, { attributes: true, attributeFilter: ['style'] });

      return true;
    };

    const frameId = window.requestAnimationFrame(() => {
      if (disposed) {
        return;
      }
      if (!attach()) {
        window.requestAnimationFrame(attach);
      }
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(rafRef.current);
      observer?.disconnect();
    };
  }, [open, enabled, sheetSelector]);
}