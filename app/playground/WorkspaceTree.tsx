'use client';

import { Fragment, useId, useMemo, type Ref } from 'react';
import { Icon, Label } from '@gravity-ui/uikit';
import { File, Folder, FolderOpen } from '@gravity-ui/icons';
import { ListContainerView, useNormalizedList, type ListTreeItemType } from '@gravity-ui/normalized-list';
import { UIKitListItemView, UIKitNormalizedList } from '@gravity-ui/normalized-list/uikit';
import { leafName, parentPath, type WorkspaceNode } from '@/lib/playground/workspace';
import type { useWorkspaceDrag } from './useWorkspaceDrag';
import styles from './playground.module.css';

const itemId = (path: string) => `node:${encodeURIComponent(path)}`;
const nodeId = ({ path }: WorkspaceNode) => itemId(path);

export function FileBadge({ name }: { name: string }) {
  const extension = leafName(name).split('.').pop()?.toLowerCase() ?? '';
  if (!/\.(?:[cm]?[jt]s|py)$/i.test(name)) return <Icon data={File} size={13} />;
  return <Label size="xxs" theme={extension.endsWith('js') ? 'warning' : extension.endsWith('ts') ? 'info' : 'success'}>
    {extension.toUpperCase()}
  </Label>;
}

export default function WorkspaceTree({ paths, folders, selected, collapsed, disabled, label, onPick, onExpand, dragRow }: {
  paths: string[];
  folders: string[];
  selected: string;
  collapsed: string[];
  disabled: boolean;
  label: string;
  onPick: (node: WorkspaceNode) => void;
  onExpand: (path: string, open: boolean) => void;
  dragRow: ReturnType<typeof useWorkspaceDrag>['row'];
}) {
  const listId = useId();
  const items = useMemo(() => {
    const tree: ListTreeItemType<WorkspaceNode>[] = [];
    const folderNodes = new Map(folders.map((path) => [path, {
      data: { path, kind: 'folder' as const }, children: [] as ListTreeItemType<WorkspaceNode>[],
    }]));
    const childrenOf = (path: string) => folderNodes.get(parentPath(path))?.children ?? tree;
    for (const [path, node] of folderNodes) childrenOf(path).push(node);
    for (const path of paths) childrenOf(path).push({ data: { path, kind: 'file' } });
    return tree;
  }, [paths, folders]);

  const list = useNormalizedList<WorkspaceNode>({
    items,
    getItemId: nodeId,
    controlledState: {
      selectedById: selected ? { [itemId(selected)]: true } : {},
      expandedById: Object.fromEntries(folders.map((path) => [itemId(path), !collapsed.includes(path)])),
      disabledById: disabled ? Object.fromEntries([...folders, ...paths].map((path) => [itemId(path), true])) : {},
    },
  });
  const { visibleFlattenIds, itemsById, groupsState } = list.structure;
  const activeId = list.state.activeItemId;
  const rowId = (id: string) => `${listId}-${id}`;

  return <UIKitNormalizedList
    list={list}
    size="m"
    className={styles.files}
    mapItemDataToContentProps={({ path, kind }) => ({
      title: leafName(path),
      startSlot: <span aria-hidden="true">{kind === 'folder'
        ? <Icon data={collapsed.includes(path) ? Folder : FolderOpen} size={14} />
        : <FileBadge name={path} />}</span>,
    })}
    onItemClick={({ id }) => {
      const node = itemsById[id];
      if (!node || disabled) return;
      list.state.setActiveItemId(id);
      onPick(node);
    }}
    renderContainer={({ containerRef, renderItem, ...props }) => (
      <ListContainerView {...props} as="ul" ref={containerRef as Ref<HTMLDivElement>} role="tree" extraProps={{
        'aria-label': label,
        'aria-disabled': disabled || undefined,
        'aria-activedescendant': !disabled && activeId && visibleFlattenIds.includes(activeId) ? rowId(activeId) : undefined,
        tabIndex: visibleFlattenIds.length && !disabled ? 0 : -1,
        onFocus: () => {
          const selectedId = itemId(selected);
          list.state.setActiveItemId(disabled ? undefined : visibleFlattenIds.includes(selectedId) ? selectedId : visibleFlattenIds[0]);
        },
        onBlur: () => list.state.setActiveItemId(undefined),
        onKeyDown: (event) => {
          if (disabled || !activeId) return;
          const node = itemsById[activeId];
          if (!node) return;
          const expanded = node.kind === 'folder' && !collapsed.includes(node.path);
          if (event.key === 'ArrowRight' && node.kind === 'folder') {
            event.preventDefault();
            if (!expanded) onExpand(node.path, true);
            else if (groupsState[activeId]?.childrenIds[0]) list.state.setActiveItemId(groupsState[activeId].childrenIds[0]);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (expanded) onExpand(node.path, false);
            else if (parentPath(node.path)) list.state.setActiveItemId(itemId(parentPath(node.path)));
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            list.state.setActiveItemId(event.key === 'Home' ? visibleFlattenIds[0] : visibleFlattenIds.at(-1));
          }
        },
      }}>
        {visibleFlattenIds.map((id, i) => <Fragment key={id}>{renderItem(id, i)}</Fragment>)}
      </ListContainerView>
    )}
    renderItem={({ props, data }) => {
      const siblings = (parentPath(data.path) ? groupsState[itemId(parentPath(data.path))]?.childrenIds : list.structure.rootIds) ?? [];
      return <UIKitListItemView {...props} {...dragRow(data)} role="treeitem" title={data.path}
        aria-level={data.path.split('/').length} aria-setsize={siblings.length}
        aria-posinset={siblings.indexOf(props.id) + 1}
        aria-expanded={data.kind === 'folder' ? !collapsed.includes(data.path) : undefined}
        aria-disabled={props.disabled || undefined}
        ref={(node) => { if (node) node.id = rowId(props.id); }} />;
    }}
  />;
}
