import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CanvasObject } from "@/modules/editor/object-registry";

interface CanvasState {
  objects: CanvasObject[];
  variables: { name: string; type?: string; initial?: string; increment?: string; step?: number }[];
}

interface CanvasActions {
  setObjects: (objects: CanvasObject[] | ((prev: CanvasObject[]) => CanvasObject[])) => void;
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObjects: (ids: string[]) => void;
  setVariables: (vars: CanvasState["variables"] | ((prev: CanvasState["variables"]) => CanvasState["variables"])) => void;
  replaceObject: (id: string, obj: CanvasObject) => void;
  moveObject: (id: string, x: number, y: number) => void;
  resizeObject: (id: string, w: number, h: number) => void;
  transformObject: (id: string, rotateDeg?: number, skewX?: number, skewY?: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveLayer: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
  toggleLock: (id: string) => void;
  toggleHide: (id: string) => void;
  groupObjects: (ids: string[]) => void;
  ungroupObjects: (ids: string[]) => void;
  reset: () => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  objects: [],
  variables: [],
};

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setObjects: (objects) =>
        set((s) => ({ objects: typeof objects === "function" ? objects(s.objects) : objects })),

      addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),

      updateObject: (id, updates) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),

      deleteObjects: (ids) => {
        const idSet = new Set(ids);
        set((s) => ({ objects: s.objects.filter((o) => !idSet.has(o.id)) }));
      },

      setVariables: (variables) =>
        set((s) => ({ variables: typeof variables === "function" ? variables(s.variables) : variables })),

      replaceObject: (id, obj) =>
        set((s) => ({ objects: s.objects.map((o) => (o.id === id ? obj : o)) })),

      moveObject: (id, x, y) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, x: o.x + x, y: o.y + y } : o,
          ),
        })),

      resizeObject: (id, w, h) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, w, h } : o)),
        })),

      transformObject: (id, rotateDeg, skewX, skewY) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...(rotateDeg !== undefined ? { rotateDeg } : {}),
                  ...(skewX !== undefined ? { skewX } : {}),
                  ...(skewY !== undefined ? { skewY } : {}),
                }
              : o,
          ),
        })),

      bringToFront: (id) =>
        set((s) => {
          const idx = s.objects.findIndex((o) => o.id === id);
          if (idx === -1) return s;
          const next = [...s.objects];
          const [item] = next.splice(idx, 1);
          next.push(item);
          return { objects: next };
        }),

      sendToBack: (id) =>
        set((s) => {
          const idx = s.objects.findIndex((o) => o.id === id);
          if (idx === -1) return s;
          const next = [...s.objects];
          const [item] = next.splice(idx, 1);
          next.unshift(item);
          return { objects: next };
        }),

      moveLayer: (id, dir) =>
        set((s) => {
          const idx = s.objects.findIndex((o) => o.id === id);
          if (idx === -1) return s;
          const next = [...s.objects];
          const [item] = next.splice(idx, 1);
          if (dir === "up") next.splice(Math.min(next.length, idx + 1), 0, item);
          else if (dir === "down") next.splice(Math.max(0, idx - 1), 0, item);
          else if (dir === "top") next.push(item);
          else next.unshift(item);
          return { objects: next };
        }),

      toggleLock: (id) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o)),
        })),

      toggleHide: (id) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, hidden: !o.hidden } : o)),
        })),

      groupObjects: (ids) => {
        if (ids.length < 2) return;
        const groupId = `g-${crypto.randomUUID()}`;
        set((s) => ({
          objects: s.objects.map((o) => (ids.includes(o.id) ? { ...o, groupId } : o)),
        }));
      },

      ungroupObjects: (ids) => {
        const groupIds = new Set(
          get().objects
            .filter((o) => ids.includes(o.id) && o.groupId)
            .map((o) => o.groupId!),
        );
        set((s) => ({
          objects: s.objects.map((o) => (o.groupId && groupIds.has(o.groupId) ? { ...o, groupId: undefined } : o)),
        }));
      },

      reset: () => set({ ...initialState }),
    }),
    { name: "canvas-store" },
  ),
);
