// ============================================================
// SAE Document Engine — Band Model
// ============================================================

import type { DocumentElement } from "./elements";

export type BandType = "header" | "body" | "footer" | "databand";

export interface BandDef {
  id: string;
  type: BandType;
  /** Band height in the document's unit (default: mm) */
  height: number;
  /** Allow band to grow if content overflows */
  canGrow: boolean;
  /** Allow band to shrink if content is shorter than height */
  canShrink: boolean;
  /** Data source name for databand expansion */
  source?: string;
  elements: DocumentElement[];
}

export const DEFAULT_BAND_HEIGHTS: Record<BandType, number> = {
  header: 40,
  body: 180,
  footer: 35,
  databand: 30,
};

export function createBand(type: BandType, height?: number): BandDef {
  return {
    id: crypto.randomUUID(),
    type,
    height: height ?? DEFAULT_BAND_HEIGHTS[type],
    canGrow: type === "body" || type === "databand",
    canShrink: false,
    elements: [],
  };
}
