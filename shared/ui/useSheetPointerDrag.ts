import { useEffect, useRef } from 'react';

const HIDE_DRAG_THRESHOLD_PX = 50;

/**
 * Gravity Sheet dismisses via touch handlers only. Pointer (mouse) drag on the top bar is enabled here.
 */
export function useSheetPointerDrag(open: boolean, sheetClassSelector: string, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return;
    }

    let disposed = false;
    let removeListeners: (() => void) | undefined;

    const attach = () => {
      if (disposed) {
        return;
      }

      const root = document.querySelector(sheetClassSelector);
      if (!root) {
        return;
      }

      const sheet = root.querySelector<HTMLElement>('.g-sheet__sheet');
      const veil = root.querySelector<HTMLElement>('.g-sheet__veil');
      const dragTargets = root.querySelectorAll<HTMLElement>(
        '.g-sheet__sheet-swipe-area, .g-sheet__sheet-top',
      );

      if (!sheet || !veil || dragTargets.length === 0) {
        return;
      }

      let startY = 0;
      let dragging = false;
      let activePointerId: number | null = null;

      const getOpenTranslateY = () => sheet.getBoundingClientRect().height;

      const applyDrag = (deltaY: number) => {
        const sheetHeight = getOpenTranslateY();
        const visibleHeight = Math.max(0, sheetHeight - deltaY);
        sheet.style.transform = `translate3d(0, -${visibleHeight}px, 0)`;
        veil.style.opacity = String(sheetHeight > 0 ? visibleHeight / sheetHeight : 0);
      };

      const resetOpenStyles = () => {
        const sheetHeight = getOpenTranslateY();
        sheet.style.transform = `translate3d(0, -${sheetHeight}px, 0)`;
        veil.style.opacity = '1';
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) {
          return;
        }
        dragging = true;
        startY = event.clientY;
        activePointerId = event.pointerId;
        event.currentTarget?.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!dragging || event.pointerId !== activePointerId) {
          return;
        }
        const deltaY = event.clientY - startY;
        if (deltaY <= 0) {
          return;
        }
        event.preventDefault();
        applyDrag(deltaY);
      };

      const finishDrag = (event: PointerEvent) => {
        if (!dragging || event.pointerId !== activePointerId) {
          return;
        }
        dragging = false;
        activePointerId = null;
        const deltaY = event.clientY - startY;
        if (deltaY > HIDE_DRAG_THRESHOLD_PX) {
          onCloseRef.current();
          return;
        }
        resetOpenStyles();
      };

      const targets = Array.from(dragTargets);
      targets.forEach((target) => {
        target.addEventListener('pointerdown', onPointerDown);
        target.addEventListener('pointermove', onPointerMove);
        target.addEventListener('pointerup', finishDrag);
        target.addEventListener('pointercancel', finishDrag);
      });

      removeListeners = () => {
        targets.forEach((target) => {
          target.removeEventListener('pointerdown', onPointerDown);
          target.removeEventListener('pointermove', onPointerMove);
          target.removeEventListener('pointerup', finishDrag);
          target.removeEventListener('pointercancel', finishDrag);
        });
      };
    };

    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(attach);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      removeListeners?.();
    };
  }, [open, sheetClassSelector]);
}