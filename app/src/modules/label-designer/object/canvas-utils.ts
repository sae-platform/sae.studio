import { replaceSpecialVariables } from "@/modules/document-engine";
import type { VariableDef } from "./types";

export const PT_PER_IN = 72;
export const MM_PER_IN = 25.4;

export function n(v: string | null | undefined, f: number): number {
  const p = Number.parseFloat((v ?? "").replace("pt", ""));
  return Number.isFinite(p) ? p : f;
}

export function pt(v: number): string {
  return v.toFixed(4).replace(/\.?0+$/, "");
}

export function cap(x: string): string {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

export function num(v: number, fallback: number): number {
  return Number.isFinite(v) ? v : fallback;
}

export function toUnit(ptValue: number, unit: "mm" | "cm" | "in" | "pt"): number {
  if (unit === "pt") return ptValue;
  if (unit === "in") return ptValue / PT_PER_IN;
  if (unit === "mm") return (ptValue / PT_PER_IN) * MM_PER_IN;
  return (ptValue / PT_PER_IN) * 2.54;
}

export function fromUnit(value: number, unit: "mm" | "cm" | "in" | "pt"): number {
  if (unit === "pt") return value;
  if (unit === "in") return value * PT_PER_IN;
  if (unit === "mm") return (value / MM_PER_IN) * PT_PER_IN;
  return (value / 2.54) * PT_PER_IN;
}

export function toHexColor(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("#")) return v;
  if (v.startsWith("0x")) {
    const hex = v.substring(2);
    if (hex.length <= 2) return "#000000";
    if (hex.length === 6) return `#${hex}`;
    return "#000000";
  }
  if (v === "none" || v === "transparent") return undefined;
  return v;
}

export function replaceVars(text: string, variables: VariableDef[]): string {
  if (!text) return text;
  let res = replaceSpecialVariables(text);
  for (const v of variables) {
    const val = v.initial || (v.increment && v.increment !== "never" ? "1" : "0");
    res = res.replaceAll(`\${${v.name}}`, val);
  }
  return res;
}

export function unitStep(unit: "mm" | "cm" | "in" | "pt"): string {
  return unit === "pt" ? "1" : unit === "in" ? "0.01" : "0.1";
}

export interface AffineMatrix { a: number; b: number; c: number; d: number }

export function toAffine(o: {
  rotateDeg: number; skewX: number; skewY: number; scaleX: number; scaleY: number;
}): AffineMatrix {
  const rad = (o.rotateDeg * Math.PI) / 180;
  const kx = Math.tan((o.skewX * Math.PI) / 180);
  const ky = Math.tan((o.skewY * Math.PI) / 180);
  const sx = o.scaleX;
  const sy = o.scaleY;
  const m11 = sx;
  const m12 = kx * sy;
  const m21 = ky * sx;
  const m22 = sy * (1 + ky * kx);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    a: cos * m11 - sin * m21,
    b: sin * m11 + cos * m21,
    c: cos * m12 - sin * m22,
    d: sin * m12 + cos * m22,
  };
}
