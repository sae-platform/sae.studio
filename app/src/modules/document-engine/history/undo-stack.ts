// ============================================================
// SAE Document Engine — Undo/Redo Stack
// Generic immutable history, max 50 steps
// ============================================================

const MAX_HISTORY = 50;

export interface UndoStackState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createUndoStack<T>(initial: T): UndoStackState<T> {
  return { past: [], present: initial, future: [] };
}

/** Push a new state. Clears the future (redo) stack. */
export function stackPush<T>(stack: UndoStackState<T>, next: T): UndoStackState<T> {
  const past = [...stack.past, stack.present].slice(-MAX_HISTORY);
  return { past, present: next, future: [] };
}

/** Undo: move present to future, pop past. Returns same stack if no past. */
export function stackUndo<T>(stack: UndoStackState<T>): UndoStackState<T> {
  if (stack.past.length === 0) return stack;
  const past = stack.past.slice(0, -1);
  const present = stack.past[stack.past.length - 1];
  return { past, present, future: [stack.present, ...stack.future] };
}

/** Redo: move present to past, pop future. Returns same stack if no future. */
export function stackRedo<T>(stack: UndoStackState<T>): UndoStackState<T> {
  if (stack.future.length === 0) return stack;
  const [present, ...future] = stack.future;
  return { past: [...stack.past, stack.present], present, future };
}

export const canUndo = <T>(s: UndoStackState<T>): boolean => s.past.length > 0;
export const canRedo = <T>(s: UndoStackState<T>): boolean => s.future.length > 0;

// ── React hook wrapper ────────────────────────────────────────

import { useState, useCallback } from "react";

export interface UseUndoStackReturn<T> {
  state: T;
  set: (next: T) => void;
  /** Functional update: reads latest state at apply time, avoids stale closures */
  update: (fn: (prev: T) => T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initial: T) => void;
}

export function useUndoStack<T>(initial: T): UseUndoStackReturn<T> {
  const [stack, setStack] = useState<UndoStackState<T>>(() => createUndoStack(initial));

  const set = useCallback((next: T) => setStack((s) => stackPush(s, next)), []);
  const update = useCallback((fn: (prev: T) => T) => setStack((s) => stackPush(s, fn(s.present))), []);
  const undo = useCallback(() => setStack((s) => stackUndo(s)), []);
  const redo = useCallback(() => setStack((s) => stackRedo(s)), []);
  const reset = useCallback((initial: T) => setStack(createUndoStack(initial)), []);

  return {
    state: stack.present,
    set,
    update,
    undo,
    redo,
    canUndo: canUndo(stack),
    canRedo: canRedo(stack),
    reset,
  };
}
