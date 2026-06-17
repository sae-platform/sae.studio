import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type Guideline = { id: string; orientation: "horizontal" | "vertical"; posPt: number };
type Unit = "mm" | "cm" | "in" | "pt";

interface ViewportState {
  zoomPercent: number;
  isPanning: boolean;
  panState: { startX: number; startY: number; startScrollLeft: number; startScrollTop: number } | null;
  rulerOffsets: { x: number; y: number };
  guidelines: Guideline[];
  activeGuidelineDrag: { id: string; startPosPt: number; hasExitedRuler?: boolean } | null;
  templateWidthPt: number;
  templateHeightPt: number;
  templateUnit: Unit;
}

interface ViewportActions {
  setZoomPercent: (zoom: number | ((prev: number) => number)) => void;
  adjustZoom: (delta: number) => void;
  setPanning: (panning: boolean) => void;
  setPanState: (state: ViewportState["panState"]) => void;
  setRulerOffsets: (offsets: { x: number; y: number }) => void;
  setGuidelines: (guidelines: Guideline[] | ((prev: Guideline[]) => Guideline[])) => void;
  addGuideline: (g: Guideline) => void;
  removeGuideline: (id: string) => void;
  setActiveGuidelineDrag: (drag: ViewportState["activeGuidelineDrag"] | ((prev: ViewportState["activeGuidelineDrag"]) => ViewportState["activeGuidelineDrag"])) => void;
  setTemplateWidth: (w: number) => void;
  setTemplateHeight: (h: number) => void;
  setTemplateUnit: (unit: Unit) => void;
  reset: () => void;
}

type ViewportStore = ViewportState & ViewportActions;

export const useViewportStore = create<ViewportStore>()(
  devtools(
    (set) => ({
      zoomPercent: 200,
      isPanning: false,
      panState: null,
      rulerOffsets: { x: 0, y: 0 },
      guidelines: [],
      activeGuidelineDrag: null,
      templateWidthPt: 200,
      templateHeightPt: 100,
      templateUnit: "mm",

      setZoomPercent: (zoom) => set((s) => ({ zoomPercent: typeof zoom === "function" ? zoom(s.zoomPercent) : Math.max(25, Math.min(500, Math.round(zoom))) })),
      adjustZoom: (delta) =>
        set((s) => ({ zoomPercent: Math.max(25, Math.min(500, s.zoomPercent + delta)) })),

      setPanning: (isPanning) => set({ isPanning }),

      setPanState: (panState) => set({ panState }),

      setRulerOffsets: (rulerOffsets) => set({ rulerOffsets }),

      setGuidelines: (guidelines) => set((s) => ({ guidelines: typeof guidelines === "function" ? guidelines(s.guidelines) : guidelines })),

      addGuideline: (g) => set((s) => ({ guidelines: [...s.guidelines, g] })),

      removeGuideline: (id) =>
        set((s) => ({ guidelines: s.guidelines.filter((g) => g.id !== id) })),

      setActiveGuidelineDrag: (drag) =>
        set((s) => ({ activeGuidelineDrag: typeof drag === "function" ? drag(s.activeGuidelineDrag) : drag })),

      setTemplateWidth: (templateWidthPt) => set({ templateWidthPt }),
      setTemplateHeight: (templateHeightPt) => set({ templateHeightPt }),
      setTemplateUnit: (templateUnit) => set({ templateUnit }),

      reset: () => set({ zoomPercent: 200, isPanning: false, panState: null, rulerOffsets: { x: 0, y: 0 }, guidelines: [], activeGuidelineDrag: null }),
    }),
    { name: "viewport-store" },
  ),
);
