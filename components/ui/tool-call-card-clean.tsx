"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {ToolMessage} from "@gravity-ui/aikit";
import type {Action, TToolStatus} from "@gravity-ui/aikit";
import {Alert, Button, ClipboardButton, Flex, Icon, Text} from "@gravity-ui/uikit";
import {ArrowRotateLeft, ChevronDown, ChevronUp, Wrench} from "@gravity-ui/icons";
import "./tool-call-card-clean.css";

/*
 * Tool call card built on AIKIT ToolMessage.
 * The header, status indicator and expand control come from ToolMessage.
 * This file only maps our call data (args, result, duration, retry) into that API.
 */

export type ToolCallStatus = "running" | "success" | "error";

export type ToolCallCardProps = {
  /** Tool name as the agent calls it, shown in mono – e.g. "search_web" */
  name: string;
  /** Short human summary – e.g. "Searched the web for 'CRM pricing 2026'" */
  summary?: ReactNode;
  /** Icon in the tile on the left – defaults to a wrench */
  icon?: ReactNode;
  status: ToolCallStatus;
  /** Arguments the tool was called with – objects are pretty-printed, JSON strings parsed */
  args?: unknown;
  /** What the tool returned – objects are pretty-printed, JSON strings parsed, other text shown as is */
  result?: unknown;
  /** Error message, shown when status is "error" */
  error?: string;
  /** When the call started (ms since epoch, e.g. Date.now()) – the live timer counts from here */
  startedAt?: number;
  /** Final duration in ms – otherwise measured while the card shows "running" */
  duration?: number;
  /** Start expanded (uncontrolled). ToolMessage owns the toggle after mount. */
  defaultOpen?: boolean;
  /** Expanded state used as the initial value. ToolMessage does not expose a controlled toggle. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Starts expanded when the call fails */
  openOnError?: boolean;
  /** Shows a Retry button in the header */
  onRetry?: () => void;
  /** Height in px after which arguments and result are capped with a fade and "Show all" */
  maxCodeHeight?: number;
  className?: string;
};

export type ToolCallGroupProps = {
  /** ToolCallCard elements – the group reads their name, icon, status and duration */
  children: ReactNode;
  /** Label once all calls are done – defaults to "Used 3 tools" */
  label?: string;
  /** Label while any call is running */
  runningLabel?: string;
  /** Total duration in ms – otherwise the sum of the cards' durations, or the time measured while running */
  duration?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const AIKIT_STATUS: Record<ToolCallStatus, TToolStatus> = {
  running: "loading",
  success: "success",
  error: "error",
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Card ---------- */

export function ToolCallCard({
  name,
  summary,
  icon,
  status,
  args,
  result,
  error,
  startedAt,
  duration,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  openOnError = true,
  onRetry,
  maxCodeHeight = 220,
  className,
}: ToolCallCardProps) {
  const measured = useStopwatch(status === "running", startedAt, false);
  const ms = status === "running" ? (measured ?? 0) : (duration ?? measured);
  const timeLabel = ms != null ? formatMs(ms, status === "running") : null;

  const headerActions: Action[] = [];
  if (timeLabel) {
    headerActions.push(
      <Text key="duration" variant="caption-1" color="hint">
        {timeLabel}
      </Text>,
    );
  }
  if (onRetry) {
    headerActions.push({
      label: "Retry",
      view: "outlined",
      icon: <Icon data={ArrowRotateLeft} size={16} />,
      onClick: onRetry,
    });
  }

  const hasBody =
    status === "error" ||
    args !== undefined ||
    result !== undefined ||
    status === "running" ||
    status === "success";

  return (
    <ToolMessage
      className={cx("tool-call-card", className)}
      toolName={name}
      toolIcon={icon ?? <Icon data={Wrench} size={16} />}
      status={AIKIT_STATUS[status]}
      headerContent={
        summary != null ? (
          <Text
            variant="body-1"
            color="secondary"
            ellipsis
            className="tool-call-card__summary"
            title={typeof summary === "string" ? summary : undefined}
          >
            {summary}
          </Text>
        ) : undefined
      }
      headerActions={headerActions}
      expandable={hasBody}
      initialExpanded={Boolean(openProp ?? defaultOpen) || (openOnError && status === "error")}
      bodyContent={
        <div className="tool-call-card__body">
          {status === "error" && (
            <Alert theme="danger" view="outlined" layout="horizontal" align="center" message={error ?? "The tool call failed."} />
          )}
          {args !== undefined && <CodeSection label="Arguments" value={args} cap={maxCodeHeight} />}
          {result !== undefined ? (
            <CodeSection label="Result" value={result} cap={maxCodeHeight} />
          ) : status === "running" ? (
            <Text variant="caption-1" color="hint">
              Waiting for result…
            </Text>
          ) : args === undefined && status === "success" ? (
            <Text variant="caption-1" color="hint">
              No arguments or result.
            </Text>
          ) : null}
        </div>
      }
    />
  );
}

/* ---------- Group ---------- */

export function ToolCallGroup({
  children,
  label,
  runningLabel = "Using tools…",
  duration,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
}: ToolCallGroupProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  const calls = Children.toArray(children)
    .filter(isValidElement)
    .map((c) => (c as ReactElement<Partial<ToolCallCardProps>>).props);
  const running = calls.some((c) => c.status === "running");
  const failed = calls.filter((c) => c.status === "error").length;

  const measured = useStopwatch(running, undefined, true);
  const sum = calls.length && calls.every((c) => c.duration != null) ? calls.reduce((t, c) => t + (c.duration ?? 0), 0) : null;
  const ms = running ? measured : (duration ?? sum ?? measured);

  const count = `Used ${calls.length} ${calls.length === 1 ? "tool" : "tools"}`;
  const title = running ? runningLabel : (label ?? count);
  const icons = calls.slice(-3);

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  return (
    <Flex direction="column" gap={2} className={cx("tool-call-group", className)}>
      <Button view="flat" className="tool-call-group__head" aria-expanded={open} onClick={toggle}>
        <Flex as="span" alignItems="center" className="tool-call-group__stack">
          {icons.map((c, i) => (
            <span className="tool-call-group__tile" key={calls.length - icons.length + i}>
              {c.icon ?? <Icon data={Wrench} size={12} />}
            </span>
          ))}
        </Flex>
        <Flex as="span" alignItems="baseline" gap={2}>
          <Text variant="body-1" color={running ? "secondary" : "primary"} ellipsis>
            {title}
          </Text>
          {!running && failed > 0 && (
            <Text variant="body-1" color="danger">
              · {failed} failed
            </Text>
          )}
          {ms != null && (
            <Text variant="body-1" color="hint">
              · {formatMs(ms, running)}
            </Text>
          )}
        </Flex>
        <Icon data={open ? ChevronUp : ChevronDown} size={16} />
      </Button>
      {open ? children : null}
    </Flex>
  );
}

/* ---------- Pieces ---------- */

function CodeSection({label, value, cap}: {label: string; value: unknown; cap: number}) {
  const {text, json} = toText(value);
  const pre = useRef<HTMLPreElement>(null);
  const [full, setFull] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = pre.current;
    const inner = el?.firstElementChild;
    if (!el || !inner) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [text]);

  const capped = height > cap + 24;

  return (
    <Flex direction="column" gap={2}>
      <Flex alignItems="center" justifyContent="space-between" gap={2}>
        <Text variant="caption-2" color="hint">
          {label}
        </Text>
        <ClipboardButton
          text={text}
          view="outlined"
          size="s"
          aria-label={`Copy ${label.toLowerCase()}`}
          tooltipInitialText={`Copy ${label.toLowerCase()}`}
          tooltipSuccessText="Copied"
        />
      </Flex>
      <pre
        ref={pre}
        className="tool-call-card__code"
        data-capped={capped && !full ? "" : undefined}
        style={capped && !full ? {maxHeight: cap} : undefined}
      >
        <code>{json ? highlight(text) : text}</code>
      </pre>
      {capped && (
        <Button view="flat" size="s" aria-expanded={full} onClick={() => setFull(!full)}>
          {full ? "Show less" : "Show all"}
        </Button>
      )}
    </Flex>
  );
}

function useStopwatch(running: boolean, startedAt: number | undefined, accumulate: boolean) {
  const start = useRef<number | null>(null);
  const base = useRef(0);
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!running) {
      if (start.current !== null) {
        base.current += Date.now() - start.current;
        start.current = null;
        setMs(base.current);
      }
      return;
    }
    if (!accumulate) base.current = 0;
    start.current = startedAt ?? Date.now();
    const tick = () => setMs(base.current + Date.now() - (start.current ?? Date.now()));
    tick();
    const t = window.setInterval(tick, 100);
    return () => window.clearInterval(t);
  }, [running, startedAt, accumulate]);
  return ms;
}

function formatMs(ms: number, live: boolean) {
  if (!live && ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(Math.floor(ms / 100) / 10).toFixed(1)}s`;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function toText(value: unknown): {text: string; json: boolean} {
  if (typeof value === "string") {
    const t = value.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return {text: JSON.stringify(JSON.parse(t), null, 2), json: true};
      } catch {
        /* not JSON – shown as plain text */
      }
    }
    return {text: value, json: false};
  }
  try {
    const s = JSON.stringify(value, null, 2);
    return s === undefined ? {text: String(value), json: false} : {text: s, json: true};
  } catch {
    return {text: String(value), json: false};
  }
}

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function highlight(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(TOKEN.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      out.push(
        <span key={m.index} className="tool-call-card__token_key">
          {m[1]}
        </span>,
        m[2],
      );
    } else {
      const kind = m[1] ? "str" : /^[tfn]/.test(m[0]) ? "lit" : "num";
      out.push(
        <span key={m.index} className={`tool-call-card__token_${kind}`}>
          {m[0]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
