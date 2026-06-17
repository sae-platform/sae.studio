// ============================================================
// SAE Document Engine — Layer Model
// ============================================================

export interface LayerDef {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** Higher zIndex = rendered on top */
  zIndex: number;
}

export const DEFAULT_LAYER: LayerDef = {
  id: "default",
  name: "Content",
  visible: true,
  locked: false,
  zIndex: 0,
};

export function createLayer(name: string, zIndex?: number): LayerDef {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    locked: false,
    zIndex: zIndex ?? 0,
  };
}
