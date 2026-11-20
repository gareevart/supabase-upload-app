import { createRoot, type Root } from 'react-dom/client';
import { createElement, useState } from 'react';
import { Switch } from '@gravity-ui/uikit';
import type { Mark, MarkSpec } from 'prosemirror-model';
import { Plugin, type EditorState, type Transaction } from 'prosemirror-state';
import { Mapping } from 'prosemirror-transform';
import type { EditorView } from 'prosemirror-view';
import { linkType, type Extension } from '@gravity-ui/markdown-editor';

const LINK_OG_ATTR = 'og';

interface LabelRef {
  current: string;
}

interface LinkRange {
  from: number;
  to: number;
  mark: Mark;
}

function findLinkAt(state: EditorState, pos: number): Mark | null {
  const type = linkType(state.schema);
  const inside = type.isInSet(state.doc.resolve(pos).marks());
  if (inside) return inside;
  if (pos <= 0) return null;
  return type.isInSet(state.doc.resolve(pos - 1).marks()) ?? null;
}

function expandLink(state: EditorState, mark: Mark, pos: number): LinkRange {
  const $pos = state.doc.resolve(Math.max(1, Math.min(pos, state.doc.content.size)));
  const parent = $pos.parent;
  const origin = $pos.start();
  const type = linkType(state.schema);
  const ranges: Array<{ from: number; to: number }> = [];
  let cursor = origin;

  parent.forEach((node) => {
    const from = cursor;
    const to = cursor + node.nodeSize;
    cursor = to;
    const nodeMark = node.isText ? type.isInSet(node.marks) : null;
    if (!nodeMark || nodeMark.attrs.href !== mark.attrs.href) return;
    const previous = ranges[ranges.length - 1];
    if (previous && previous.to === from) previous.to = to;
    else ranges.push({ from, to });
  });

  const range = ranges.find((item) => pos >= item.from && pos <= item.to);
  return range ? { from: range.from, to: range.to, mark } : { from: pos, to: pos, mark };
}

function linkTouchingSelection(state: EditorState): LinkRange | null {
  const pos = state.selection.from;
  const mark = findLinkAt(state, pos);
  if (!mark) return null;
  const atCursor = Boolean(linkType(state.schema).isInSet(state.doc.resolve(pos).marks()));
  return expandLink(state, mark, atCursor ? pos : Math.max(0, pos - 1));
}

function LinkOgControl({
  initial,
  label,
  onUpdate,
}: {
  initial: boolean;
  label: string;
  onUpdate: (enabled: boolean) => void;
}) {
  const [checked, setChecked] = useState(initial);
  return createElement(Switch, {
    size: 'm',
    checked,
    content: label,
    onUpdate: (enabled: boolean) => {
      setChecked(enabled);
      onUpdate(enabled);
    },
  });
}

export function createLinkOgExtension(labelRef: LabelRef): Extension {
  return (builder) => {
    builder.overrideMarkSpec('link', (prev) => ({
      ...prev,
      attrs: {
        ...prev.attrs,
        [LINK_OG_ATTR]: { default: true },
      },
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom) {
            const element = dom instanceof HTMLElement ? dom : null;
            return {
              href: element?.getAttribute('href') ?? '',
              title: element?.getAttribute('title'),
              [LINK_OG_ATTR]: element?.getAttribute('data-og') !== 'off',
            };
          },
        },
      ],
      toDOM(mark) {
        const attrs: Record<string, string> = {};
        if (typeof mark.attrs.href === 'string') attrs.href = mark.attrs.href;
        if (typeof mark.attrs.title === 'string' && mark.attrs.title) attrs.title = mark.attrs.title;
        if (mark.attrs[LINK_OG_ATTR] === false) attrs['data-og'] = 'off';
        return ['a', attrs];
      },
    } as MarkSpec));

    builder.overrideMarkdownTokenParserSpec('link', (prev) => ({
      ...prev,
      getAttrs(token, tokens, index) {
        const base = prev.getAttrs?.(token, tokens, index) ?? {};
        return {
          ...base,
          [LINK_OG_ATTR]: token.attrGet('data-og') !== 'off',
        };
      },
    }));

    builder.overrideMarkSerializerSpec('link', (prev) => ({
      ...prev,
      open(state, mark, parent, index) {
        if (mark.attrs[LINK_OG_ATTR] === false) {
          state.isAutolink = false;
          return '[';
        }
        return typeof prev.open === 'function' ? prev.open(state, mark, parent, index) : prev.open;
      },
      close(state, mark, parent, index) {
        if (mark.attrs[LINK_OG_ATTR] !== false) {
          return typeof prev.close === 'function' ? prev.close(state, mark, parent, index) : prev.close;
        }
        const href = String(mark.attrs.href ?? '').replaceAll(/[()]/g, (char) => `\\${char}`);
        const title = mark.attrs.title ? ` "${String(mark.attrs.title).replaceAll('"', '\\"')}"` : '';
        state.isAutolink = undefined;
        return `](${href}${title}){data-og=off}`;
      },
    }));

    builder.addPlugin(() => {
      let draftOg = true;
      let pendingDisable = false;
      const mounted = new Set<{ host: HTMLElement; root: Root }>();

      const applyOg = (view: EditorView, enabled: boolean) => {
        draftOg = enabled;
        pendingDisable = !enabled;
        const range = linkTouchingSelection(view.state);
        if (!range || (range.mark.attrs[LINK_OG_ATTR] !== false) === enabled) return;

        const transaction = view.state.tr;
        transaction.addMark(
          range.from,
          range.to,
          range.mark.type.create({ ...range.mark.attrs, [LINK_OG_ATTR]: enabled }),
        );
        transaction.setMeta('linkOgPreserve', true);
        view.dispatch(transaction);
      };

      const preserveOg = (transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) => {
        if (transactions.some((transaction) => transaction.getMeta('linkOgPreserve'))) return null;
        if (!transactions.some((transaction) => transaction.docChanged)) return null;

        const type = linkType(newState.schema);
        const mapping = new Mapping();
        transactions.forEach((transaction) => mapping.appendMapping(transaction.mapping));
        const fixes = new Map<string, LinkRange>();
        const remember = (range: LinkRange) => {
          if (range.mark.attrs[LINK_OG_ATTR] === false) return;
          fixes.set(`${range.from}:${range.to}`, range);
        };

        if (pendingDisable) {
          const active = linkTouchingSelection(newState);
          if (active) remember(active);
        }

        newState.doc.descendants((node, pos) => {
          if (!node.isText) return;
          const mark = type.isInSet(node.marks);
          if (!mark || mark.attrs[LINK_OG_ATTR] === false) return;

          const inside = pos + 1;
          const oldPos = mapping.invert().map(inside, -1);
          if (oldPos <= 0 || oldPos > oldState.doc.content.size) return;
          const oldMark = type.isInSet(oldState.doc.resolve(oldPos).marks());
          if (!oldMark || oldMark.attrs[LINK_OG_ATTR] !== false) return;

          const range = expandLink(newState, mark, inside);
          const active = linkTouchingSelection(newState);
          const userEnabledThisLink = draftOg && active?.from === range.from && active.to === range.to;
          if (userEnabledThisLink) return;
          remember(range);
        });

        if (!fixes.size) return null;

        const transaction = newState.tr;
        for (const range of fixes.values()) {
          transaction.addMark(
            range.from,
            range.to,
            range.mark.type.create({ ...range.mark.attrs, [LINK_OG_ATTR]: false }),
          );
        }
        transaction.setMeta('linkOgPreserve', true);
        return transaction;
      };

      return new Plugin({
        view(editorView) {
          const sync = () => {
            const rows = [...editorView.dom.ownerDocument.querySelectorAll<HTMLElement>('.g-popup .g-md-url-input-row')];
            for (const entry of [...mounted]) {
              if (!entry.host.isConnected) {
                entry.root.unmount();
                mounted.delete(entry);
              }
            }

            if (!rows.length) pendingDisable = false;

            rows.forEach((row) => {
              if (row.querySelector('.link-og-host')) return;
              const active = linkTouchingSelection(editorView.state);
              draftOg = active ? active.mark.attrs[LINK_OG_ATTR] !== false : true;

              const host = editorView.dom.ownerDocument.createElement('div');
              host.className = 'link-og-host';
              row.appendChild(host);
              const root = createRoot(host);
              root.render(createElement(LinkOgControl, {
                initial: draftOg,
                label: labelRef.current,
                onUpdate: (enabled: boolean) => applyOg(editorView, enabled),
              }));
              mounted.add({ host, root });
            });
          };

          return {
            update() {
              sync();
              requestAnimationFrame(sync);
            },
            destroy() {
              for (const entry of mounted) entry.root.unmount();
              mounted.clear();
            },
          };
        },
        appendTransaction: preserveOg,
      });
    });
  };
}
