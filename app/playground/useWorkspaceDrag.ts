import { useEffect, useRef, useState, type DragEvent } from 'react';
import { parentPath, type WorkspaceNode } from '@/lib/playground/workspace';

const WORKSPACE_DRAG = 'application/x-gareev-workspace-item';
const OPEN_DELAY_MS = 650;

export function useWorkspaceDrag({ disabled, collapsed, canMove, onMove, onExpand }: {
  disabled: boolean;
  collapsed: string[];
  canMove: (node: WorkspaceNode, destination: string) => boolean;
  onMove: (node: WorkspaceNode, destination: string) => void;
  onExpand: (path: string, open: boolean) => void;
}) {
  const dragged = useRef<WorkspaceNode | null>(null);
  const hovered = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [source, setSource] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);

  function clearTarget() {
    clearTimeout(timer.current);
    timer.current = undefined;
    hovered.current = null;
    setDestination(null);
  }

  function reset() {
    dragged.current = null;
    setSource(null);
    clearTarget();
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) {
      dragged.current = null;
      hovered.current = null;
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, [disabled]);

  function target(path: string) {
    const validDrop = (event: DragEvent) => {
      const node = dragged.current;
      return !disabled && node && event.dataTransfer.types.includes(WORKSPACE_DRAG) &&
        parentPath(node.path) !== path && canMove(node, path) ? node : null;
    };

    return {
      'data-drop-target': !disabled && dragged.current !== null && destination === path || undefined,
      onDragOver: (event: DragEvent) => {
        if (!validDrop(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (hovered.current === path) return;
        clearTarget();
        hovered.current = path;
        setDestination(path);
        if (path && collapsed.includes(path)) {
          timer.current = setTimeout(() => {
            if (hovered.current === path) onExpand(path, true);
          }, OPEN_DELAY_MS);
        }
      },
      onDragLeave: (event: DragEvent) => {
        if (hovered.current !== path ||
            (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) return;
        clearTarget();
      },
      onDrop: (event: DragEvent) => {
        const node = validDrop(event);
        if (!node) return;
        event.preventDefault();
        reset();
        onMove(node, path);
      },
    };
  }

  function row(node: WorkspaceNode) {
    return {
      ...(node.kind === 'folder' ? target(node.path) : {}),
      draggable: !disabled,
      'data-drag-source': !disabled && dragged.current !== null && source === node.path || undefined,
      onDragStart: (event: DragEvent) => {
        if (disabled) { event.preventDefault(); return; }
        event.dataTransfer.effectAllowed = 'move';
        // Use an app-specific type and the in-memory source; never accept external files or paths.
        event.dataTransfer.setData(WORKSPACE_DRAG, 'move');
        clearTarget();
        dragged.current = node;
        setSource(node.path);
      },
      onDragEnd: reset,
    };
  }

  return { row, root: target('') };
}
