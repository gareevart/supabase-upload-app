"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ThinkingLoaderProps = {
  phases?: string[];
  interval?: number;
  phase?: number;
  loop?: boolean;
  done?: boolean;
  doneLabel?: string | ((seconds: number) => string);
  size?: "sm" | "md";
  variant?: "pill" | "plain";
  className?: string;
};

const DEFAULT_PHASES = ["Thinking", "Searching the web", "Reading sources", "Writing response"];
const RAYS = Array.from({ length: 8 }, (_, index) => index);

export function ThinkingLoader({
  phases = DEFAULT_PHASES,
  interval = 2200,
  phase,
  loop = false,
  done = false,
  doneLabel = (seconds) => `Thought for ${seconds}s`,
  size = "md",
  variant = "pill",
  className,
}: ThinkingLoaderProps) {
  const [step, setStep] = useState(0);
  const startedAt = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const wasDone = useRef(done);

  useEffect(() => {
    if (done && !wasDone.current) {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
    } else if (!done && wasDone.current) {
      setElapsedSeconds(null);
      startedAt.current = Date.now();
      setStep(0);
    }
    wasDone.current = done;
  }, [done]);

  useEffect(() => {
    if (done || phase !== undefined || phases.length < 2) return;

    const timer = window.setInterval(() => {
      setStep((currentStep) =>
        currentStep + 1 < phases.length ? currentStep + 1 : loop ? 0 : currentStep,
      );
    }, interval);

    return () => window.clearInterval(timer);
  }, [done, interval, loop, phase, phases.length]);

  const index = Math.min(Math.max(phase ?? step, 0), Math.max(phases.length - 1, 0));
  const seconds = elapsedSeconds ?? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
  const label = done
    ? typeof doneLabel === "function"
      ? doneLabel(seconds)
      : doneLabel
    : (phases[index] ?? "");

  const [shown, setShown] = useState({ key: 0, text: label });
  const [leaving, setLeaving] = useState<{ key: number; text: string } | null>(null);

  useEffect(() => {
    if (label === shown.text) return;
    setLeaving(shown);
    setShown({ key: shown.key + 1, text: label });
  }, [label, shown]);

  const textBox = useRef<HTMLSpanElement>(null);
  const currentLabel = useRef<HTMLSpanElement>(null);
  const hasMeasured = useRef(false);

  useLayoutEffect(() => {
    const box = textBox.current;
    const current = currentLabel.current;
    if (!box || !current) return;

    if (!hasMeasured.current) box.style.transition = "none";
    box.style.width = `${current.offsetWidth + 1}px`;

    if (!hasMeasured.current) {
      box.getBoundingClientRect();
      box.style.transition = "";
      hasMeasured.current = true;
    }
  }, [shown.key]);

  return (
    <span
      className={["ui-thinking-loader", className].filter(Boolean).join(" ")}
      data-size={size}
      data-variant={variant}
      data-done={done || undefined}
      role="status"
      aria-live="polite"
    >
      <style>{styles}</style>

      <span className="ui-thinking-loader__icon" aria-hidden="true">
        <svg className="ui-thinking-loader__spinner" viewBox="0 0 16 16">
          {RAYS.map((ray) => (
            <line
              key={ray}
              x1="8"
              y1="1.75"
              x2="8"
              y2="4.75"
              transform={`rotate(${ray * 45} 8 8)`}
              style={{ animationDelay: `${(ray - 8) * 100}ms` }}
            />
          ))}
        </svg>
        <svg className="ui-thinking-loader__check" viewBox="0 0 16 16">
          <path d="M3.5 8.4 6.6 11.3 12.5 4.9" pathLength={1} />
        </svg>
      </span>

      <span ref={textBox} className="ui-thinking-loader__text">
        {leaving && (
          <span
            key={leaving.key}
            className="ui-thinking-loader__label ui-thinking-loader__label--out"
            aria-hidden="true"
            onAnimationEnd={() => setLeaving(null)}
          >
            {leaving.text}
          </span>
        )}
        <span
          key={shown.key}
          ref={currentLabel}
          className={[
            "ui-thinking-loader__label",
            shown.key > 0 && "ui-thinking-loader__label--in",
            !done && "ui-thinking-loader__shine",
          ]
            .filter(Boolean)
            .join(" ")}
          data-text={shown.text}
        >
          {shown.text}
        </span>
      </span>
    </span>
  );
}

const styles = /* css */ `
.ui-thinking-loader {
  --ui-tl-ink: var(--g-color-text-primary);
  --ui-tl-text: var(--g-color-text-secondary);
  --ui-tl-ray: var(--g-color-text-primary);
  --ui-tl-bg: var(--g-color-base-background);
  --ui-tl-line: var(--g-color-line-generic);
  --ui-tl-shine: var(--g-color-text-primary);
  --ui-tl-done: var(--g-color-text-positive);
  --ui-tl-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ui-tl-height: 34px;
  --ui-tl-font: 14px;
  --ui-tl-icon: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: var(--ui-tl-height);
  padding: 0 15px 0 12px;
  border-radius: 999px;
  background: var(--ui-tl-bg);
  box-shadow: inset 0 0 0 1px var(--ui-tl-line), 0 1px 2px var(--g-color-sfx-shadow);
  color: var(--ui-tl-text);
  font-family: var(--g-text-body-font-family), ui-sans-serif, system-ui, sans-serif;
  font-size: var(--ui-tl-font);
  line-height: 1;
  vertical-align: middle;
  -webkit-font-smoothing: antialiased;
}
.ui-thinking-loader[data-size="sm"] {
  --ui-tl-height: 28px;
  --ui-tl-font: 13px;
  --ui-tl-icon: 13px;
  gap: 7px;
  padding: 0 12px 0 10px;
}
.ui-thinking-loader[data-variant="plain"] {
  padding: 0;
  background: none;
  box-shadow: none;
}
.ui-thinking-loader__icon {
  position: relative;
  flex: none;
  width: var(--ui-tl-icon);
  height: var(--ui-tl-icon);
}
.ui-thinking-loader__icon svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  transition: opacity 240ms ease, transform 420ms var(--ui-tl-ease);
}
.ui-thinking-loader__spinner line {
  stroke: var(--ui-tl-ray);
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0.18;
  animation: ui-tl-ray 800ms linear infinite;
}
.ui-thinking-loader__check {
  opacity: 0;
  transform: scale(0.6);
  fill: none;
  stroke: var(--ui-tl-done);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ui-thinking-loader__check path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.ui-thinking-loader[data-done] .ui-thinking-loader__spinner {
  opacity: 0;
  transform: scale(0.6) rotate(-45deg);
}
.ui-thinking-loader[data-done] .ui-thinking-loader__check {
  opacity: 1;
  transform: none;
}
.ui-thinking-loader[data-done] .ui-thinking-loader__check path {
  animation: ui-tl-draw 360ms var(--ui-tl-ease) 120ms forwards;
}
.ui-thinking-loader__text {
  position: relative;
  display: block;
  height: 1.3em;
  overflow: hidden;
  transition: width 460ms var(--ui-tl-ease);
}
.ui-thinking-loader__label {
  position: absolute;
  top: 0;
  left: 0;
  line-height: 1.3em;
  white-space: nowrap;
}
.ui-thinking-loader[data-done] .ui-thinking-loader__label { color: var(--ui-tl-ink); }
.ui-thinking-loader__label--in { animation: ui-tl-in 460ms var(--ui-tl-ease) both; }
.ui-thinking-loader__label--out { animation: ui-tl-out 320ms var(--ui-tl-ease) both; }
.ui-thinking-loader__shine::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  white-space: nowrap;
  color: transparent;
  background: linear-gradient(90deg, transparent 38%, var(--ui-tl-shine) 50%, transparent 62%) 100% 0 / 300% 100% no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ui-tl-sweep 1.8s linear infinite;
  opacity: 0.28;
  pointer-events: none;
}
@keyframes ui-tl-ray { 0% { opacity: 1; } 100% { opacity: 0.18; } }
@keyframes ui-tl-in { from { opacity: 0; transform: translateY(70%); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ui-tl-out { from { opacity: 1; transform: none; filter: none; } to { opacity: 0; transform: translateY(-70%); filter: blur(3px); } }
@keyframes ui-tl-draw { to { stroke-dashoffset: 0; } }
@keyframes ui-tl-sweep { from { background-position: 100% 0; } to { background-position: 0% 0; } }
@media (prefers-reduced-motion: reduce) {
  .ui-thinking-loader *,
  .ui-thinking-loader *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
  .ui-thinking-loader__spinner line { opacity: 0.6; }
  .ui-thinking-loader__shine::after { display: none; }
  .ui-thinking-loader__check path { stroke-dashoffset: 0; }
}
`;
