// ============================================================
// SAE Document Engine — Page Model
// ============================================================

import type { BandDef } from "./band";
import { createBand } from "./band";
import type { LayerDef } from "./layer";
import { DEFAULT_LAYER } from "./layer";

export type PageUnit = "mm" | "cm" | "in" | "pt";

export interface PageDef {
  id: string;
  width: number;
  height: number;
  unit: PageUnit;
  orientation: "portrait" | "landscape";
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  header?: BandDef;
  body?: BandDef;
  footer?: BandDef;
  /** Data-driven repeating bands */
  dataBands?: BandDef[];
  /** Layers ordered by zIndex ascending */
  layers: LayerDef[];
}

export const PAGE_PRESETS: Record<string, { width: number; height: number; unit: PageUnit }> = {
  A4:          { width: 210,  height: 297,  unit: "mm" },
  A5:          { width: 148,  height: 210,  unit: "mm" },
  "Media Carta": { width: 140, height: 216, unit: "mm" },
  Letter:      { width: 215.9, height: 279.4, unit: "mm" },
  Legal:       { width: 215.9, height: 355.6, unit: "mm" },
  "Half Letter": { width: 139.7, height: 215.9, unit: "mm" },
  Rollo80mm:   { width: 80,   height: 297,  unit: "mm" },
  Rollo58mm:   { width: 58,   height: 297,  unit: "mm" },
};

export function createPage(preset?: string): PageDef {
  const size = PAGE_PRESETS[preset ?? "A4"] ?? PAGE_PRESETS["A4"];
  return {
    id: crypto.randomUUID(),
    width: size.width,
    height: size.height,
    unit: size.unit,
    orientation: "portrait",
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 12,
    marginRight: 12,
    header: createBand("header"),
    body:   createBand("body"),
    footer: createBand("footer"),
    layers: [{ ...DEFAULT_LAYER }],
  };
}
