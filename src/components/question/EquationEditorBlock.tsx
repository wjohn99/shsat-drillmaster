import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { EeSpec } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Undo2, Redo2 } from "lucide-react";

const DEFAULT_INSTRUCTION = "Enter your answer in the space.";

type EquationEditorBlockProps = {
  spec: EeSpec;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

const MAX_HISTORY = 80;

/** Improper fraction — stacked boxes, centered in keypad cell */
function FractionGlyph() {
  return (
    <span
      className="flex h-6 w-8 flex-col items-center justify-center gap-px text-current"
      aria-hidden
    >
      <span className="h-[7px] w-[18px] shrink-0 rounded-[2px] border border-current" />
      <span className="leading-none">—</span>
      <span className="h-[7px] w-[18px] shrink-0 rounded-[2px] border border-current" />
    </span>
  );
}

/** Mixed number — whole + fraction, centered as a unit */
function MixedGlyph() {
  return (
    <span
      className="flex h-6 items-center justify-center gap-0.5 text-current"
      aria-hidden
    >
      <span className="h-3.5 w-3.5 shrink-0 rounded-[2px] border border-current" />
      <span className="flex flex-col items-center justify-center gap-px leading-none">
        <span className="h-[5px] w-[14px] shrink-0 rounded-[2px] border border-current" />
        <span className="scale-90">—</span>
        <span className="h-[5px] w-[14px] shrink-0 rounded-[2px] border border-current" />
      </span>
    </span>
  );
}

/** Keeps focus on the answer input when using toolbar/keypad (avoids losing the caret). */
function retainInputFocus(e: MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
}

/** Allow focus to leave the EE field for real controls (links, notes, page buttons). */
function shouldAllowExternalFocus(
  target: HTMLElement | null,
  eeInput: HTMLInputElement,
  eeRoot: HTMLElement
): boolean {
  if (!target) return true;
  if (eeInput.contains(target)) return true;
  if (target.closest("a[href]")) return true;
  if (target.closest("textarea, select")) return true;
  const inp = target.closest("input");
  if (inp && inp !== eeInput) return true;
  const btn = target.closest("button");
  if (btn && !eeRoot.contains(btn)) return true;
  return false;
}

export function EquationEditorBlock({ spec, value, onChange, disabled }: EquationEditorBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const instruction = spec.instruction?.trim() || DEFAULT_INSTRUCTION;
  const prefix = spec.inputPrefix ?? "";

  const specFocusKey = useMemo(
    () => [spec.instruction, spec.inputPrefix, spec.acceptableAnswers.join("|")].join("\0"),
    [spec.acceptableAnswers, spec.instruction, spec.inputPrefix]
  );

  const ensureInputFocused = useCallback(() => {
    const el = inputRef.current;
    if (!el || disabled) return;
    if (document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      inputRef.current?.blur();
      return;
    }
    const id = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => cancelAnimationFrame(id);
  }, [disabled, specFocusKey]);

  /** Keeps the caret active: mousedown outside the field (but not on real controls) won’t move focus away. */
  useEffect(() => {
    if (disabled) return;
    const onMouseDownCapture = (e: MouseEvent) => {
      const input = inputRef.current;
      const root = rootRef.current;
      if (!input || !root) return;
      const target = e.target as HTMLElement;
      if (input.contains(target)) return;
      if (shouldAllowExternalFocus(target, input, root)) return;
      if (target.closest("button") && root.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("mousedown", onMouseDownCapture, true);
    return () => document.removeEventListener("mousedown", onMouseDownCapture, true);
  }, [disabled]);

  const commit = useCallback(
    (next: string, recordUndo: boolean) => {
      if (recordUndo && next !== value) {
        setPast((p) => [...p.slice(-MAX_HISTORY + 1), value]);
        setFuture([]);
      }
      onChange(next);
    },
    [onChange, value]
  );

  const insertAtCursor = useCallback(
    (insert: string) => {
      if (disabled) return;
      ensureInputFocused();
      const el = inputRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? start;
      const next = value.slice(0, start) + insert + value.slice(end);
      commit(next, true);
      const pos = start + insert.length;
      queueMicrotask(() => {
        const inp = inputRef.current;
        if (inp) inp.setSelectionRange(pos, pos);
      });
    },
    [commit, disabled, ensureInputFocused, value]
  );

  const moveCursor = useCallback(
    (delta: number) => {
      if (disabled) return;
      ensureInputFocused();
      const el = inputRef.current;
      if (!el) return;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? start;
      const pos = Math.max(0, Math.min(value.length, (start === end ? start : end) + delta));
      queueMicrotask(() => el.setSelectionRange(pos, pos));
    },
    [disabled, ensureInputFocused, value.length]
  );

  const backspace = useCallback(() => {
    if (disabled) return;
    ensureInputFocused();
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    if (start !== end) {
      commit(value.slice(0, start) + value.slice(end), true);
      queueMicrotask(() => inputRef.current?.setSelectionRange(start, start));
      return;
    }
    if (start === 0) return;
    const next = value.slice(0, start - 1) + value.slice(start);
    commit(next, true);
    queueMicrotask(() => inputRef.current?.setSelectionRange(start - 1, start - 1));
  }, [commit, disabled, ensureInputFocused, value]);

  const clearAll = useCallback(() => {
    if (disabled) return;
    ensureInputFocused();
    commit("", true);
    queueMicrotask(() => inputRef.current?.setSelectionRange(0, 0));
  }, [commit, disabled, ensureInputFocused]);

  const undo = useCallback(() => {
    if (disabled || past.length === 0) return;
    ensureInputFocused();
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [value, ...f]);
    onChange(prev);
    queueMicrotask(() => inputRef.current?.setSelectionRange(prev.length, prev.length));
  }, [disabled, ensureInputFocused, onChange, past, value]);

  const redo = useCallback(() => {
    if (disabled || future.length === 0) return;
    ensureInputFocused();
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p.slice(-MAX_HISTORY + 1), value]);
    onChange(next);
    queueMicrotask(() => inputRef.current?.setSelectionRange(next.length, next.length));
  }, [disabled, ensureInputFocused, onChange, future, value]);

  useEffect(() => {
    setPast([]);
    setFuture([]);
  }, [spec.acceptableAnswers, spec.inputPrefix, spec.instruction]);

  const row1 = ["1", "2", "3", "4", "5"];
  const row2 = ["6", "7", "8", "9", "0"];
  const keyClass =
    "h-10 min-w-[2.5rem] rounded-md border border-foreground/25 bg-background px-2 font-medium shadow-sm hover:bg-muted/80";
  /** Keypad cells that show a custom icon — full flex centering */
  const iconKeyClass = cn(
    keyClass,
    "inline-flex items-center justify-center p-0 [&:active]:scale-[0.98]"
  );

  return (
    <div className="space-y-3">
      <p className="text-base text-foreground">{instruction}</p>

      <div
        ref={rootRef}
        className={cn(
          "overflow-hidden rounded-md border-2 border-foreground/20 bg-background shadow-sm",
          disabled && "opacity-90"
        )}
      >
        {/* Input row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-foreground/15 px-3 py-3">
          {prefix ? (
            <span className="shrink-0 font-mono text-sm font-medium text-foreground">{prefix}</span>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={value}
            onChange={(e) => commit(e.target.value, true)}
            className={cn(
              "min-h-[2.5rem] min-w-[12rem] flex-1 cursor-default rounded border-2 border-dashed border-foreground/40 bg-background px-3 py-2 font-mono text-base",
              "outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
              !disabled && "pointer-events-none",
              disabled && "cursor-not-allowed"
            )}
            aria-label="Answer field — use keypad and arrow buttons to edit; the mouse cannot move the cursor here"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-foreground/10 bg-muted/60 px-2 py-1.5">
          <ToolbarIcon
            label="Move cursor left"
            disabled={disabled}
            onClick={() => moveCursor(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </ToolbarIcon>
          <ToolbarIcon
            label="Move cursor right"
            disabled={disabled}
            onClick={() => moveCursor(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </ToolbarIcon>
          <ToolbarIcon label="Undo" disabled={disabled || past.length === 0} onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </ToolbarIcon>
          <ToolbarIcon label="Redo" disabled={disabled || future.length === 0} onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </ToolbarIcon>
          <ToolbarIcon label="Backspace" disabled={disabled || !value} onClick={backspace}>
            <DeleteBackspaceIcon />
          </ToolbarIcon>
          <ToolbarIcon label="Clear" disabled={disabled || !value} onClick={clearAll}>
            <Trash2 className="h-4 w-4" />
          </ToolbarIcon>
        </div>

        {/* Keypad */}
        <div className="space-y-1.5 p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {row1.map((k) => (
              <button
                key={k}
                type="button"
                disabled={disabled}
                className={keyClass}
                onMouseDown={disabled ? undefined : retainInputFocus}
                onClick={() => insertAtCursor(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {row2.map((k) => (
              <button
                key={k}
                type="button"
                disabled={disabled}
                className={keyClass}
                onMouseDown={disabled ? undefined : retainInputFocus}
                onClick={() => insertAtCursor(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              disabled={disabled}
              className={keyClass}
              onMouseDown={disabled ? undefined : retainInputFocus}
              onClick={() => insertAtCursor("%")}
            >
              %
            </button>
            <button
              type="button"
              disabled={disabled}
              className={keyClass}
              onMouseDown={disabled ? undefined : retainInputFocus}
              onClick={() => insertAtCursor("-")}
            >
              −
            </button>
            <button
              type="button"
              disabled={disabled}
              className={keyClass}
              onMouseDown={disabled ? undefined : retainInputFocus}
              onClick={() => insertAtCursor(".")}
            >
              .
            </button>
            <button
              type="button"
              disabled={disabled}
              className={iconKeyClass}
              title="Improper fraction: type inside each ( ) — numerator / denominator"
              onMouseDown={disabled ? undefined : retainInputFocus}
              onClick={() => insertAtCursor("( ) / ( )")}
            >
              <FractionGlyph />
            </button>
            <button
              type="button"
              disabled={disabled}
              className={iconKeyClass}
              title="Mixed number: type inside each ( ) — whole + numerator / denominator"
              onMouseDown={disabled ? undefined : retainInputFocus}
              onClick={() => insertAtCursor("( ) + ( ) / ( )")}
            >
              <MixedGlyph />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarIcon({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full text-foreground"
      title={label}
      disabled={disabled}
      onMouseDown={disabled ? undefined : retainInputFocus}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Square-with-X style backspace icon (matches reference affordance). */
function DeleteBackspaceIcon() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute inset-0 rounded border border-current" />
      <span className="text-[10px] font-bold leading-none">×</span>
    </span>
  );
}
