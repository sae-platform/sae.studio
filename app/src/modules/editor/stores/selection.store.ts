import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type BoxSelectState = {
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
};

export type DragState = {
  mode: "move" | "resize" | "transform";
  id: string;
  handle?: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  startRotateDeg?: number;
  startSkewX?: number;
  startSkewY?: number;
  centerClientX?: number;
  centerClientY?: number;
  startAngleRad?: number;
  transformKind?: "rotate" | "skewX" | "skewY" | "skewAuto";
  originMap?: Record<string, { x: number; y: number }>;
};

export type ContextMenuState = { x: number; y: number; id: string | null } | null;

interface SelectionState {
  selectedIds: string[];
  drag: DragState | null;
  boxSelect: BoxSelectState | null;
  contextMenu: ContextMenuState;
  transformModeIds: string[];
  historyIndex: number;
}

interface SelectionActions {
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setDrag: (drag: DragState | null) => void;
  setBoxSelect: (box: BoxSelectState | null | ((prev: BoxSelectState | null) => BoxSelectState | null)) => void;
  setContextMenu: (ctx: ContextMenuState) => void;
  setTransformModeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleTransformMode: (id: string) => void;
  reset: () => void;
}

type SelectionStore = SelectionState & SelectionActions;

const initialState: SelectionState = {
  selectedIds: [],
  drag: null,
  boxSelect: null,
  contextMenu: null,
  transformModeIds: [],
  historyIndex: 0,
};

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setSelectedIds: (ids) =>
        set((s) => ({
          selectedIds: typeof ids === "function" ? ids(s.selectedIds) : ids,
          transformModeIds: [],
          contextMenu: null,
        })),

      toggleSelected: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),

      clearSelection: () => set({ selectedIds: [], transformModeIds: [], contextMenu: null }),

      setDrag: (drag) => set({ drag }),

      setBoxSelect: (boxSelect) =>
        set((s) => ({
          boxSelect: typeof boxSelect === "function" ? boxSelect(s.boxSelect) : boxSelect,
        })),

      setContextMenu: (contextMenu) => set({ contextMenu }),

      setTransformModeIds: (ids) =>
        set((s) => ({
          transformModeIds: typeof ids === "function" ? ids(s.transformModeIds) : ids,
        })),

      toggleTransformMode: (id) =>
        set((s) => ({
          transformModeIds: s.transformModeIds.includes(id)
            ? s.transformModeIds.filter((x) => x !== id)
            : [...s.transformModeIds, id],
        })),

      reset: () => set({ ...initialState }),
    }),
    { name: "selection-store" },
  ),
);
