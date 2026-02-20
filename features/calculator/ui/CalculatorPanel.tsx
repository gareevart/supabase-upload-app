"use client";

import { Xmark } from "@gravity-ui/icons";
import { useEffect, useRef, useState } from "react";
import { Button, Icon, Text } from "@gravity-ui/uikit";
import "./CalculatorPanel.css";

const TOP_ACTIONS = ["⌫", "C", "%"];
const DIGIT_ACTIONS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "+/-"];
const OPERATOR_ACTIONS = ["/", "x", "-", "+", "="];

type CalculatorPanelProps = {
  draggable?: boolean;
  zIndex?: number;
  onActivate?: () => void;
  onClose?: () => void;
};

export function CalculatorPanel({ draggable = false, zIndex, onActivate, onClose }: CalculatorPanelProps) {
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [isFreshInput, setIsFreshInput] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const panelRef = useRef<HTMLElement>(null);

  const hasWindowControls = draggable || Boolean(onClose);

  const calculate = (left: number, right: number, currentOperator: string): number => {
    switch (currentOperator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "x":
        return left * right;
      case "/":
        return right === 0 ? 0 : left / right;
      default:
        return right;
    }
  };

  const handleDigitAction = (action: string) => {
    if (action === "+/-") {
      if (display !== "0") {
        setDisplay(display.startsWith("-") ? display.slice(1) : `-${display}`);
      }
      return;
    }

    if (action === ".") {
      if (isFreshInput) {
        setDisplay("0.");
        setIsFreshInput(false);
        return;
      }

      if (!display.includes(".")) {
        setDisplay(`${display}.`);
      }
      return;
    }

    if (isFreshInput) {
      setDisplay(action);
      setIsFreshInput(false);
      return;
    }

    setDisplay(display === "0" ? action : `${display}${action}`);
  };

  const handleTopAction = (action: string) => {
    if (action === "C") {
      setDisplay("0");
      setStoredValue(null);
      setOperator(null);
      setIsFreshInput(true);
      return;
    }

    if (action === "⌫") {
      if (isFreshInput) {
        return;
      }

      if (display.length <= 1 || (display.startsWith("-") && display.length === 2)) {
        setDisplay("0");
        setIsFreshInput(true);
        return;
      }

      setDisplay(display.slice(0, -1));
      return;
    }

    if (action === "%") {
      const value = Number(display);
      setDisplay(String(value / 100));
      setIsFreshInput(true);
    }
  };

  const handleOperatorAction = (action: string) => {
    const current = Number(display);

    if (action === "=") {
      if (storedValue === null || !operator) {
        return;
      }

      const result = calculate(storedValue, current, operator);
      setDisplay(String(result));
      setStoredValue(null);
      setOperator(null);
      setIsFreshInput(true);
      return;
    }

    if (storedValue !== null && operator && !isFreshInput) {
      const result = calculate(storedValue, current, operator);
      setDisplay(String(result));
      setStoredValue(result);
    } else {
      setStoredValue(current);
    }

    setOperator(action);
    setIsFreshInput(true);
  };

  useEffect(() => {
    if (!draggable) {
      return;
    }

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const nextX = Math.max(16, (window.innerWidth - panelRect.width) / 2);
    const nextY = Math.max(16, (window.innerHeight - panelRect.height) / 2);

    setPosition({ x: nextX, y: nextY });
  }, [draggable]);

  const handleWindowDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) {
      return;
    }

    event.preventDefault();

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const dragStartX = event.clientX;
    const dragStartY = event.clientY;
    const originX = position.x;
    const originY = position.y;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;

    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX;
      const deltaY = moveEvent.clientY - dragStartY;

      const maxX = Math.max(16, window.innerWidth - panelWidth - 16);
      const maxY = Math.max(16, window.innerHeight - panelHeight - 16);

      const nextX = Math.min(maxX, Math.max(16, originX + deltaX));
      const nextY = Math.min(maxY, Math.max(16, originY + deltaY));

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section
      ref={panelRef}
      className={`calculator-panel ${draggable ? "calculator-panel--floating" : ""} ${isDragging ? "calculator-panel--dragging" : ""}`}
      style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, zIndex } : undefined}
      onPointerDownCapture={draggable ? onActivate : undefined}
      aria-label="Calculator panel"
      role={draggable ? "dialog" : undefined}
      aria-modal={draggable ? "false" : undefined}
    >
      {draggable && (
        <div
          className="calculator-panel__drag-zone"
          onPointerDown={handleWindowDragStart}
          aria-hidden="true"
        />
      )}

      <div
        className={`calculator-panel__header ${draggable ? "calculator-panel__header--draggable" : ""}`}
        onPointerDown={handleWindowDragStart}
      >
        <div className="calculator-panel__header-controls">
          {hasWindowControls ? (
            <Button
              view="outlined"
              size="s"
              className="calculator-panel__close-button"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Close calculator widget"
            >
              <Icon data={Xmark} size={14} />
            </Button>
          ) : (
            <div className="calculator-panel__header-spacer" aria-hidden="true" />
          )}
        </div>

        <div className="calculator-panel__result" aria-live="polite" aria-atomic="true">
          <Text variant="display-2" className="calculator-panel__result-value">
            {display}
          </Text>
        </div>
      </div>

      <div className="calculator-panel__layout">
        <div className="calculator-panel__grid" aria-label="Calculator input buttons">
          {TOP_ACTIONS.map((action) => (
            <Button
              key={action}
              view="outlined"
              size="xl"
              className="calculator-panel__button"
              onClick={() => handleTopAction(action)}
            >
              {action}
            </Button>
          ))}

          {DIGIT_ACTIONS.map((action) => (
            <Button
              key={action}
              view="normal"
              size="xl"
              className="calculator-panel__button"
              onClick={() => handleDigitAction(action)}
            >
              {action}
            </Button>
          ))}
        </div>

        <div className="calculator-panel__operators" aria-label="Calculator operators">
          {OPERATOR_ACTIONS.map((action) => (
            <Button
              key={action}
              view="action"
              size="xl"
              className="calculator-panel__button"
              onClick={() => handleOperatorAction(action)}
            >
              {action}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
