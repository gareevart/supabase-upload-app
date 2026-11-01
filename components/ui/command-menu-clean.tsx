"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  logo?: ReactNode;
  icon?: ReactNode;
  keys?: string[];
  keywords?: string[];
};

export type CommandGroup = {
  id: string;
  label: string;
  commands: CommandItem[];
};

export type CommandMenuProps = {
  groups?: CommandGroup[];
  placeholder?: string;
  onRun?: (id: string, query?: string) => void;
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
};

const defaultGroups: CommandGroup[] = [
  {
    id: "suggestions",
    label: "Suggestions",
    commands: [
      { id: "ask", label: "Ask the assistant", hint: "Use your own words", logo: "AI", keywords: ["help", "question"] },
      { id: "search", label: "Search", hint: "Find anything", logo: "S" },
    ],
  },
  {
    id: "general",
    label: "General",
    commands: [
      { id: "home", label: "Go home", icon: "⌂" },
      { id: "settings", label: "Open settings", icon: "⚙" },
    ],
  },
];

export function CommandMenu({
  groups = defaultGroups,
  placeholder = "Type a command or search…",
  onRun,
  onClose,
  autoFocus = false,
  className,
}: CommandMenuProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ranLabel, setRanLabel] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        commands: group.commands.filter((command) =>
          [command.label, command.hint, ...(command.keywords ?? [])]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(term)),
        ),
      }))
      .filter((group) => group.commands.length > 0);
  }, [groups, query]);

  const commands = useMemo(
    () => filteredGroups.flatMap((group) => group.commands),
    [filteredGroups],
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!commands.some((command) => command.id === activeId)) {
      setActiveId(commands[0]?.id ?? null);
    }
  }, [activeId, commands]);

  useEffect(() => {
    const focusMenu = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusMenu);
    return () => window.removeEventListener("keydown", focusMenu);
  }, []);

  const run = (command: CommandItem, value = query.trim()) => {
    setPressedId(command.id);
    setRanLabel(command.label);
    window.setTimeout(() => setPressedId(null), 160);
    onRun?.(command.id, command.id === "ask" ? value : undefined);
  };

  const move = (amount: number) => {
    if (!commands.length) return;
    const current = commands.findIndex((command) => command.id === activeId);
    const next = (Math.max(current, 0) + amount + commands.length) % commands.length;
    setActiveId(commands[next].id);
    document.getElementById(`${inputId}-${commands[next].id}`)?.scrollIntoView({ block: "nearest" });
  };

  const jumpGroup = (amount: number) => {
    const nonEmpty = filteredGroups.filter((group) => group.commands.length);
    if (!nonEmpty.length) return;
    const current = nonEmpty.findIndex((group) => group.commands.some((command) => command.id === activeId));
    const next = (Math.max(current, 0) + amount + nonEmpty.length) % nonEmpty.length;
    setActiveId(nonEmpty[next].commands[0].id);
  };

  return (
    <div className={["ui-command-menu", className].filter(Boolean).join(" ")}>
      <style>{styles}</style>
      <label className="ui-command-menu__search" htmlFor={inputId}>
        <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m12.5 12.5 4 4"/></svg>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded="true"
          aria-activedescendant={activeId ? `${inputId}-${activeId}` : undefined}
          value={query}
          placeholder={placeholder}
          maxLength={4000}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              move(event.key === "ArrowDown" ? 1 : -1);
            } else if (event.key === "Tab") {
              event.preventDefault();
              jumpGroup(event.shiftKey ? -1 : 1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (query.trim()) onRun?.("ask", query.trim());
              else {
                const selected = commands.find((command) => command.id === activeId);
                if (selected) run(selected);
              }
            } else if (event.key === "Escape") {
              event.preventDefault();
              if (query) setQuery("");
              else onClose?.();
            } else if ((event.metaKey || event.ctrlKey) && /^[1-5]$/.test(event.key)) {
              const suggestion = groups.find((group) => group.id === "suggestions")?.commands[Number(event.key) - 1];
              if (suggestion) {
                event.preventDefault();
                run(suggestion);
              }
            }
          }}
        />
        <kbd>esc</kbd>
      </label>

      <div id={listId} role="listbox" className="ui-command-menu__list" onMouseLeave={() => setActiveId(null)}>
        {filteredGroups.map((group) => (
          <section key={group.id} role="group" aria-labelledby={`${inputId}-${group.id}-label`}>
            <h2 id={`${inputId}-${group.id}-label`}>{group.label}</h2>
            {group.commands.map((command, commandIndex) => {
              const active = command.id === activeId;
              const shortcut = command.keys ?? (group.id === "suggestions" && commandIndex < 5 ? ["⌘", String(commandIndex + 1)] : undefined);
              return (
                <button
                  key={command.id}
                  id={`${inputId}-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="ui-command-menu__row"
                  data-active={active || undefined}
                  data-pressed={pressedId === command.id || undefined}
                  onMouseEnter={() => setActiveId(command.id)}
                  onFocus={() => setActiveId(command.id)}
                  onClick={() => run(command)}
                >
                  <span className="ui-command-menu__mark" data-logo={command.logo != null || undefined} aria-hidden="true">
                    {command.logo ?? command.icon}
                  </span>
                  <span className="ui-command-menu__label">{command.label}</span>
                  {command.hint && <span className="ui-command-menu__hint">{command.hint}</span>}
                  {shortcut && <span className="ui-command-menu__keys" aria-hidden="true">{shortcut.map((key) => <kbd key={key}>{key}</kbd>)}</span>}
                </button>
              );
            })}
          </section>
        ))}
        {!commands.length && query.trim() && (
          <button type="button" className="ui-command-menu__row" onClick={() => onRun?.("ask", query.trim())}>
            <span className="ui-command-menu__mark" data-logo aria-hidden="true">AI</span>
            <span className="ui-command-menu__label">Ask about “{query.trim()}”</span>
            <span className="ui-command-menu__keys" aria-hidden="true"><kbd>↵</kbd></span>
          </button>
        )}
      </div>

      <footer className="ui-command-menu__footer">
        <span aria-live="polite">{ranLabel ? <><span className="ui-command-menu__check">✓</span> Ran {ranLabel}</> : "Select a command to run"}</span>
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate <kbd>↵</kbd> run</span>
      </footer>
    </div>
  );
}

const styles = /* css */ `
.ui-command-menu { --cm-bg:var(--g-color-base-float,#fff);--cm-text:var(--g-color-text-primary,#171717);--cm-muted:var(--g-color-text-secondary,#737373);--cm-line:var(--g-color-line-generic,#e5e5e5);--cm-hover:var(--g-color-base-simple-hover,#f5f5f5);--cm-accent:var(--g-color-text-link,#2563eb);width:min(100%,600px);overflow:hidden;border:1px solid var(--cm-line);border-radius:16px;background:var(--cm-bg);color:var(--cm-text);box-shadow:0 18px 60px rgba(0,0,0,.16);font:400 14px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;box-sizing:border-box}
.ui-command-menu *{box-sizing:border-box}.ui-command-menu__search{display:flex;align-items:center;gap:12px;min-height:58px;padding:0 16px;border-bottom:1px solid var(--cm-line)}.ui-command-menu__search svg{width:18px;height:18px;fill:none;stroke:var(--cm-muted);stroke-width:1.6;stroke-linecap:round}.ui-command-menu__search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--cm-text);font:inherit;font-size:16px}.ui-command-menu__search input::placeholder{color:var(--cm-muted)}.ui-command-menu kbd{display:inline-grid;min-width:22px;height:22px;place-items:center;padding:0 5px;border:1px solid var(--cm-line);border-radius:6px;background:var(--cm-bg);color:var(--cm-muted);font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 1px 0 var(--cm-line)}
.ui-command-menu__list{max-height:min(420px,62vh);overflow:auto;padding:8px}.ui-command-menu section+section{margin-top:8px;padding-top:8px;border-top:1px solid var(--cm-line)}.ui-command-menu h2{margin:0;padding:6px 10px;color:var(--cm-muted);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}.ui-command-menu__row{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:46px;padding:7px 9px;border:0;border-radius:10px;background:transparent;color:var(--cm-text);font:inherit;text-align:left;cursor:pointer;transition:background-color 120ms ease,transform 90ms ease}.ui-command-menu__row[data-active]{background:var(--cm-hover)}.ui-command-menu__row[data-pressed]{transform:scale(.985)}.ui-command-menu__row:focus-visible{outline:2px solid var(--cm-accent);outline-offset:-2px}.ui-command-menu__mark{display:grid;flex:none;width:30px;height:30px;place-items:center;color:var(--cm-muted)}.ui-command-menu__mark[data-logo]{border:1px solid var(--cm-line);border-radius:8px;background:var(--cm-bg);color:var(--cm-text);font-size:10px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.05)}.ui-command-menu__mark svg{width:18px;height:18px}.ui-command-menu__label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.ui-command-menu__hint{min-width:0;flex:1;overflow:hidden;color:var(--cm-muted);text-overflow:ellipsis;white-space:nowrap}.ui-command-menu__keys{display:flex;gap:4px;margin-left:auto}.ui-command-menu__footer{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:8px 16px;border-top:1px solid var(--cm-line);color:var(--cm-muted);font-size:11px}.ui-command-menu__footer>span{display:flex;align-items:center;gap:5px}.ui-command-menu__check{display:inline-grid;width:18px;height:18px;place-items:center;border-radius:50%;background:var(--cm-accent);color:white;animation:cm-pop 220ms cubic-bezier(.34,1.56,.64,1)}
@keyframes cm-pop{from{transform:scale(.5);opacity:0}}@media(max-width:520px){.ui-command-menu{border-radius:14px}.ui-command-menu__list{max-height:60vh}.ui-command-menu__hint,.ui-command-menu__keys,.ui-command-menu__footer>span:last-child{display:none}.ui-command-menu__row{min-height:50px}}@media(prefers-reduced-motion:reduce){.ui-command-menu__row,.ui-command-menu__check{transition:none;animation:none}}
`;
