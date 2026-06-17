import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { eventBus, Events, type SelectionChangeEvent } from "@/shared/events";

export type Obj = {
  id: string;
  type: "text" | "barcode" | "box" | "line" | "ellipse" | "image" | "path";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  rotateDeg: number;
  skewX: number;
  skewY: number;
  groupId?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  textAlign?: string;
  textColor?: string;
  barcodeKind?: string;
  lineWidth?: number;
  color?: string;
  opacity?: number;
  borderRadius?: number;
  src?: string;
};

export type Guideline = {
  id: string;
  orientation: "horizontal" | "vertical";
  posPt: number;
};

export type DragState = {
  mode: "move" | "resize" | "transform";
  handleName?: string;
  startX: number;
  startY: number;
  originMap?: Map<string, { x: number; y: number }>;
  centerClientX?: number;
  centerClientY?: number;
  startAngleRad?: number;
  transformKind?: "rotate" | "skewAuto" | "skewX" | "skewY";
  startRotateDeg?: number;
  startSkewX?: number;
  startSkewY?: number;
};

export type BoxSelectState = {
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
};

export type VariableDef = {
  name: string;
  type: "text" | "integer" | "decimal" | "date";
  initial?: string;
  increment?: "never" | "per_item" | "per_page";
  step?: number;
};

export interface CanvasState {
  objects: Obj[];
  variables: VariableDef[];
  templateWidthPt: number;
  templateHeightPt: number;
  templateUnit: "mm" | "cm" | "in" | "pt";
  selectedIds: string[];
  transformModeIds: string[];
  zoomPercent: number;
  isPanning: boolean;
  drag: DragState | null;
  boxSelect: BoxSelectState | null;
  guidelines: Guideline[];
  activeGuidelineDrag: {
    id: string;
    orientation: "horizontal" | "vertical";
    startPosPt: number;
    startClientX: number;
    startClientY: number;
  } | null;
  contextMenu: { x: number; y: number; id: string | null } | null;
  status: string;
}

interface CanvasActions {
  setObjects: (objects: Obj[]) => void;
  addObject: (obj: Obj) => void;
  updateObject: (id: string, updates: Partial<Obj>) => void;
  deleteObjects: (ids: string[]) => void;
  setVariables: (vars: VariableDef[]) => void;
  setTemplateSize: (width: number, height: number) => void;
  setTemplateUnit: (unit: "mm" | "cm" | "in" | "pt") => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setTransformModeIds: (ids: string[]) => void;
  toggleTransformMode: (id: string) => void;
  setZoomPercent: (zoom: number) => void;
  setPanning: (panning: boolean) => void;
  setDrag: (drag: DragState | null) => void;
  setBoxSelect: (boxSelect: BoxSelectState | null) => void;
  setGuidelines: (guidelines: Guideline[]) => void;
  setActiveGuidelineDrag: (drag: CanvasState["activeGuidelineDrag"]) => void;
  setContextMenu: (ctx: CanvasState["contextMenu"]) => void;
  setStatus: (status: string) => void;
  reset: () => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  objects: [],
  variables: [],
  templateWidthPt: 200,
  templateHeightPt: 100,
  templateUnit: "mm",
  selectedIds: [],
  transformModeIds: [],
  zoomPercent: 200,
  isPanning: false,
  drag: null,
  boxSelect: null,
  guidelines: [],
  activeGuidelineDrag: null,
  contextMenu: null,
  status: "",
};

const emitSelectionChange = (selectedIds: string[], objects: Obj[]) => {
  const types = selectedIds.map((id) => objects.find((o) => o.id === id)?.type ?? "unknown");
  eventBus.emit(Events.SELECTION_CHANGE, {
    count: selectedIds.length,
    types,
  } as SelectionChangeEvent);
};

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setObjects: (objects) => set({ objects }),

      addObject: (obj) =>
        set((state) => {
          const objects = [...state.objects, obj];
          emitSelectionChange([obj.id], objects);
          return { objects };
        }),

      updateObject: (id, updates) =>
        set((state) => ({
          objects: state.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),

      deleteObjects: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          const objects = state.objects.filter((o) => !idSet.has(o.id));
          const selectedIds = state.selectedIds.filter((id) => !idSet.has(id));
          const transformModeIds = state.transformModeIds.filter((id) => !idSet.has(id));
          emitSelectionChange(selectedIds, objects);
          return { objects, selectedIds, transformModeIds };
        }),

      setVariables: (variables) => set({ variables }),

      setTemplateSize: (width, height) =>
        set({ templateWidthPt: width, templateHeightPt: height }),

      setTemplateUnit: (unit) => set({ templateUnit: unit }),

      setSelectedIds: (ids) => {
        const { objects } = get();
        emitSelectionChange(ids, objects);
        set({ selectedIds: ids, transformModeIds: [] });
      },

      toggleSelected: (id) =>
        set((state) => {
          const ids = state.selectedIds.includes(id)
            ? state.selectedIds.filter((s) => s !== id)
            : [...state.selectedIds, id];
          emitSelectionChange(ids, state.objects);
          return { selectedIds: ids };
        }),

      clearSelection: () => set({ selectedIds: [], transformModeIds: [], contextMenu: null }),

      setTransformModeIds: (ids) => set({ transformModeIds: ids }),

      toggleTransformMode: (id) =>
        set((state) => ({
          transformModeIds: state.transformModeIds.includes(id)
            ? state.transformModeIds.filter((t) => t !== id)
            : [...state.transformModeIds, id],
        })),

      setZoomPercent: (zoom) => set({ zoomPercent: Math.max(25, Math.min(500, zoom)) }),

      setPanning: (panning) => set({ isPanning: panning }),

      setDrag: (drag) => set({ drag }),

      setBoxSelect: (boxSelect) => set({ boxSelect }),

      setGuidelines: (guidelines) => set({ guidelines }),

      setActiveGuidelineDrag: (activeGuidelineDrag) => set({ activeGuidelineDrag }),

      setContextMenu: (ctx) => set({ contextMenu: ctx }),

      setStatus: (status) => set({ status }),

      reset: () => set({ ...initialState }),
    }),
    { name: "canvas-store" },
  ),
);
