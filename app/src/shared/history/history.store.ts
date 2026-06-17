import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { UndoableOperation } from "./types";
import { eventBus } from "@/shared/events";
import { Events } from "@/shared/events";

interface HistoryActions {
  push: <T>(operation: Omit<UndoableOperation<T>, "timestamp">) => void;
  undo: () => UndoableOperation | undefined;
  redo: () => UndoableOperation | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
  setMaxEntries: (max: number) => void;
}

type HistoryStore = {
  past: UndoableOperation[];
  future: UndoableOperation[];
  maxEntries: number;
} & HistoryActions;

const emitChange = (past: UndoableOperation[], future: UndoableOperation[]) => {
  eventBus.emit(Events.HISTORY_CHANGE, {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    operationCount: past.length,
  });
};

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],
      maxEntries: 50,

      push: (operation) => {
        set((state) => {
          const past = [
            ...state.past,
            { ...operation, timestamp: Date.now() },
          ].slice(-state.maxEntries);
          const future: UndoableOperation[] = [];
          emitChange(past, future);
          return { past, future };
        });
      },

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return undefined;
        const operation = past[past.length - 1];
        set({
          past: past.slice(0, -1),
          future: [operation, ...future],
        });
        emitChange(past.slice(0, -1), [operation, ...future]);
        return operation;
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return undefined;
        const operation = future[0];
        set({
          past: [...past, operation],
          future: future.slice(1),
        });
        emitChange([...past, operation], future.slice(1));
        return operation;
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      clear: () => {
        set({ past: [], future: [] });
        emitChange([], []);
      },

      setMaxEntries: (max: number) => {
        set((state) => {
          const past = state.past.slice(-max);
          return { past, maxEntries: max };
        });
      },
    }),
    { name: "history-store" },
  ),
);
